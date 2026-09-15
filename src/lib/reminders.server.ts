/**
 * Recordatorios automáticos por push (server-only).
 * Zona de referencia: America/Panama (UTC-5 fijo, sin horario de verano).
 */
import { sendToSubscriptions, type PushBody } from "./push-notify.server";

const PA_OFFSET_MS = 5 * 60 * 60 * 1000;

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

type CallUp = {
  id: string;
  kind: string;
  starts_at: string;
  place: string | null;
};

export function buildSoonMessage(cu: CallUp): PushBody {
  const title = cu.kind === "entreno" ? "Hoy hay entreno" : "Hoy hay partido";
  const parts = [horaPA(cu.starts_at)];
  if (cu.place?.trim()) parts.push(cu.place.trim());
  return { title, body: parts.join(" · "), url: `/call-ups/${cu.id}` };
}

export function buildNightMessage(cu: CallUp): PushBody {
  const title = cu.kind === "entreno" ? "Mañana hay entreno" : "Mañana hay partido";
  const parts = [`Mañana ${horaPA(cu.starts_at)}`];
  if (cu.place?.trim()) parts.push(cu.place.trim());
  return { title, body: parts.join(" · "), url: `/call-ups/${cu.id}` };
}

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function pushToUsers(admin: Admin, userIds: string[], message: PushBody) {
  if (userIds.length === 0) return { sent: 0, failed: 0 };
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (error) throw error;
  return await sendToSubscriptions((subs ?? []) as any, message, async (ids) => {
    await admin.from("push_subscriptions").delete().in("id", ids);
  });
}

/**
 * Procesa un lote de convocatorias: envía el push a las convocadas pendientes
 * y marca la columna correspondiente. Devuelve cuántos avisos se mandaron.
 */
async function processCallUps(
  admin: Admin,
  callUps: CallUp[],
  column: "remind_soon_at" | "remind_night_before_at",
  build: (cu: CallUp) => PushBody,
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

    const res = await pushToUsers(admin, userIds, build(cu));
    sent += res.sent;

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

export async function runReminders(): Promise<{
  soon_sent: number;
  night_sent: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as Admin;

  const now = new Date();
  const in3h = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  // (B) Unas horas antes: eventos futuros dentro de las próximas 3 horas.
  const { data: soonRows, error: soonErr } = await admin
    .from("call_ups")
    .select("id, kind, starts_at, place")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", in3h.toISOString());
  if (soonErr) throw soonErr;

  const soon_sent = await processCallUps(
    admin,
    (soonRows ?? []) as CallUp[],
    "remind_soon_at",
    buildSoonMessage,
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
      .select("id, kind, starts_at, place")
      .gte("starts_at", new Date(desde).toISOString())
      .lt("starts_at", new Date(hasta).toISOString());
    if (nightErr) throw nightErr;

    night_sent = await processCallUps(
      admin,
      (nightRows ?? []) as CallUp[],
      "remind_night_before_at",
      buildNightMessage,
    );
  }

  return { soon_sent, night_sent };
}
