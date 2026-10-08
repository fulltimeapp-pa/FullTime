/**
 * Recordatorios automáticos por push (server-only).
 * Zona de referencia: America/Panama (UTC-5 fijo, sin horario de verano).
 *
 * - "Unas horas antes": cuando faltan 3 horas o menos para la hora de referencia, que es la
 *   hora de convocatoria si el profe la puso (a qué hora llegar) o, si no, la de inicio.
 * - "Noche anterior": entre 6 y 9 p. m. de Panamá, para lo de mañana.
 * Cada jugadora recibe cada recordatorio una sola vez (columnas remind_*_at), y se salta a
 * las que ya dijeron que no van.
 */
import { logPush, sendToSubscriptions, type PushBody } from "./push-notify.server";

const PA_OFFSET_MS = 5 * 60 * 60 * 1000;
const SOON_WINDOW_MS = 3 * 60 * 60 * 1000;

/** Hora en formato es-PA, ej "6:00 p. m." */
export function horaPA(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-PA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Panama",
  });
}

/** Fecha calendario de Panamá (YYYY-MM-DD) para un instante dado. */
export function fechaPA(d: Date): string {
  return new Date(d.getTime() - PA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Hora del día (0-23) en Panamá. */
export function horaDelDiaPA(d: Date): number {
  return new Date(d.getTime() - PA_OFFSET_MS).getUTCHours();
}

export type ReminderCallUp = {
  id: string;
  club_id?: string;
  kind: string;
  starts_at: string;
  meet_at?: string | null;
  place: string | null;
};

/** Hora que importa para llegar: convocatoria si existe, si no el inicio. */
export function horaReferencia(cu: ReminderCallUp): string {
  return cu.meet_at ?? cu.starts_at;
}

/** "Convocatoria 2:00 p. m. · Partido 3:00 p. m." o solo "6:30 p. m.". */
function horasTexto(cu: ReminderCallUp): string {
  if (cu.meet_at) return `Convocatoria ${horaPA(cu.meet_at)} · Partido ${horaPA(cu.starts_at)}`;
  return horaPA(cu.starts_at);
}

/** "Unas horas antes". Dice "Hoy" o "Mañana" según el día real en Panamá. */
export function buildSoonMessage(cu: ReminderCallUp, now: Date = new Date()): PushBody {
  const esHoy = fechaPA(new Date(horaReferencia(cu))) === fechaPA(now);
  const cuando = esHoy ? "Hoy" : "Mañana";
  const title = cu.kind === "entreno" ? `${cuando} hay entreno` : `${cuando} hay partido`;
  const parts = [horasTexto(cu)];
  if (cu.place?.trim()) parts.push(cu.place.trim());
  return { title, body: parts.join(" · "), url: `/call-ups/${cu.id}` };
}

export function buildNightMessage(cu: ReminderCallUp): PushBody {
  const title = cu.kind === "entreno" ? "Mañana hay entreno" : "Mañana hay partido";
  const parts = [`Mañana · ${horasTexto(cu)}`];
  if (cu.place?.trim()) parts.push(cu.place.trim());
  return { title, body: parts.join(" · "), url: `/call-ups/${cu.id}` };
}

/** Las que entran en la ventana de "unas horas antes" según su hora de referencia. */
export function inSoonWindow(cu: ReminderCallUp, now: Date): boolean {
  const ref = new Date(horaReferencia(cu)).getTime();
  return ref >= now.getTime() && ref <= now.getTime() + SOON_WINDOW_MS;
}

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

/**
 * Procesa un lote de convocatorias: envía el push a las convocadas que no dijeron que no
 * y que todavía no recibieron este recordatorio, y marca la columna. Devuelve cuántos salieron.
 */
async function processCallUps(
  admin: Admin,
  callUps: ReminderCallUp[],
  column: "remind_soon_at" | "remind_night_before_at",
  build: (cu: ReminderCallUp) => PushBody,
): Promise<number> {
  let sent = 0;
  for (const cu of callUps) {
    const { data: rows, error } = await admin
      .from("call_up_players")
      .select("id, status, players(user_id)")
      .eq("call_up_id", cu.id)
      .is(column, null);
    if (error) throw error;

    const pending = (rows ?? []).filter((r: any) => r.status !== "declined");
    if (pending.length === 0) continue;

    const userIds = Array.from(
      new Set(
        pending
          .map((r: any) => r.players?.user_id as string | null)
          .filter((v: string | null): v is string => !!v),
      ),
    );

    let res = { sent: 0, failed: 0, detail: null as string | null };
    let reachable = 0;
    if (userIds.length > 0) {
      const { data: subs, error: sErr } = await admin
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth")
        .in("user_id", userIds);
      if (sErr) throw sErr;
      reachable = new Set((subs ?? []).map((s: any) => s.user_id as string)).size;
      res = await sendToSubscriptions((subs ?? []) as any, build(cu), async (ids) => {
        await admin.from("push_subscriptions").delete().in("id", ids);
      });
    }
    sent += res.sent;

    await logPush(admin as any, {
      club_id: cu.club_id ?? null,
      call_up_id: cu.id,
      kind: column === "remind_soon_at" ? "auto_soon" : "auto_night",
      targeted: pending.length,
      reachable,
      sent: res.sent,
      failed: res.failed,
      detail: res.detail,
    });

    // Se marca aunque no tuviera avisos activados: así no se reintenta cada 15 minutos.
    await admin
      .from("call_up_players")
      .update({ [column]: new Date().toISOString() } as any)
      .in(
        "id",
        pending.map((r: any) => r.id as string),
      );
  }
  return sent;
}

export async function runReminders(now: Date = new Date()): Promise<{
  soon_sent: number;
  night_sent: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as Admin;

  // (B) Unas horas antes. La convocatoria es como mucho anterior al inicio, así que basta
  // traer lo que empieza en las próximas 15 h y filtrar por la hora de referencia.
  const { data: soonRows, error: soonErr } = await admin
    .from("call_ups")
    .select("id, club_id, kind, starts_at, meet_at, place")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", new Date(now.getTime() + 15 * 60 * 60 * 1000).toISOString());
  if (soonErr) throw soonErr;

  const soon_sent = await processCallUps(
    admin,
    ((soonRows ?? []) as ReminderCallUp[]).filter((cu) => inSoonWindow(cu, now)),
    "remind_soon_at",
    (cu) => buildSoonMessage(cu, now),
  );

  // (A) Noche anterior: sólo entre las 18:00 y 21:00 hora de Panamá.
  let night_sent = 0;
  const hora = horaDelDiaPA(now);
  if (hora >= 18 && hora < 21) {
    const mananaPA = fechaPA(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    // Rango UTC que cubre el día calendario de Panamá "mañana".
    const desde = new Date(`${mananaPA}T00:00:00.000Z`).getTime() + PA_OFFSET_MS;
    const hasta = desde + 24 * 60 * 60 * 1000;

    const { data: nightRows, error: nightErr } = await admin
      .from("call_ups")
      .select("id, club_id, kind, starts_at, meet_at, place")
      .gte("starts_at", new Date(desde).toISOString())
      .lt("starts_at", new Date(hasta).toISOString());
    if (nightErr) throw nightErr;

    night_sent = await processCallUps(
      admin,
      (nightRows ?? []) as ReminderCallUp[],
      "remind_night_before_at",
      buildNightMessage,
    );
  }

  return { soon_sent, night_sent };
}
