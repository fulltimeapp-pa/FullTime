/**
 * Lógica server-only para armar y enviar los avisos push de convocatorias/entrenos.
 */
import { sendWebPush, type WebPushSub } from "./webpush.server";

export type PushBody = { title: string; body: string; url: string };

export function formatWhenShort(iso: string): string {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-PA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Panama",
  });
  const hora = d.toLocaleTimeString("es-PA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Panama",
  });
  return `${fecha} · ${hora}`;
}

export type CallUpMessageKind = "new" | "updated" | "reminder";

const TITLES: Record<CallUpMessageKind, { entreno: string; partido: string }> = {
  new: { entreno: "Nuevo entreno", partido: "Nueva convocatoria" },
  updated: { entreno: "Cambio en el entreno", partido: "Cambio en el partido" },
  reminder: { entreno: "¿Vas al entreno? Confirma", partido: "¿Vas al partido? Confirma" },
};

export function buildCallUpMessage(cu: {
  id: string;
  kind: string;
  starts_at: string;
  ends_at?: string | null;
  meet_at?: string | null;
  place: string | null;
  objetivo: string | null;
}, kind: CallUpMessageKind = "new"): PushBody {
  const title = TITLES[kind][cu.kind === "entreno" ? "entreno" : "partido"];
  const fin = cu.ends_at
    ? new Date(cu.ends_at).toLocaleTimeString("es-PA", { hour: "numeric", minute: "2-digit", timeZone: "America/Panama" })
    : "";
  const hora = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-PA", { hour: "numeric", minute: "2-digit", timeZone: "America/Panama" });
  const parts = [
    cu.meet_at
      ? `${formatWhenShort(cu.starts_at)} · Convocatoria ${hora(cu.meet_at)}`
      : fin ? `${formatWhenShort(cu.starts_at)} – ${fin}` : formatWhenShort(cu.starts_at),
  ];
  if (cu.place?.trim()) parts.push(cu.place.trim());
  if (cu.kind === "entreno" && cu.objetivo?.trim()) parts.push(cu.objetivo.trim().slice(0, 60));
  return { title, body: parts.join(" · "), url: `/call-ups/${cu.id}` };
}

/** Un solo aviso cuando se crean varios entrenos de una vez. */
export function buildBulkTrainingMessage(startsAt: string[]): PushBody {
  const sorted = [...startsAt].sort();
  const dia = (iso: string) =>
    new Date(iso).toLocaleDateString("es-PA", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "America/Panama",
    });
  const n = sorted.length;
  const body = n === 1 ? dia(sorted[0]) : `Del ${dia(sorted[0])} al ${dia(sorted[n - 1])}`;
  return {
    title: n === 1 ? "Nuevo entreno" : `Tu profe publicó ${n} entrenos`,
    body: `${body} · Toca para verlos y confirmar`,
    url: "/mis-convocatorias",
  };
}

export async function sendToSubscriptions(
  subs: (WebPushSub & { id: string })[],
  message: PushBody,
  onGone: (ids: string[]) => Promise<void>,
): Promise<{ sent: number; failed: number; detail: string | null }> {
  const payload = JSON.stringify(message);
  const gone: string[] = [];
  const fallas = new Map<string, number>();
  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      const res = await sendWebPush(sub, payload);
      if (res.ok) sent++;
      else {
        failed++;
        const k = res.gone ? `${res.status} (celular ya no existe)` : String(res.status);
        fallas.set(k, (fallas.get(k) ?? 0) + 1);
        if (res.gone) gone.push(sub.id);
      }
    } catch (e) {
      failed++;
      const k = `error: ${((e as Error)?.message ?? String(e)).slice(0, 80)}`;
      fallas.set(k, (fallas.get(k) ?? 0) + 1);
      console.error("[push] falló el envío", (e as Error)?.message ?? String(e));
    }
  }

  if (gone.length > 0) await onGone(gone);
  const detail = fallas.size ? Array.from(fallas, ([k, n]) => `${k} ×${n}`).join(", ") : null;
  return { sent, failed, detail };
}

type PushLogRow = {
  club_id: string | null;
  call_up_id: string | null;
  kind: string;
  targeted?: number;
  reachable?: number;
  sent?: number;
  failed?: number;
  detail?: string | null;
};

/** Anota un envío en push_log. Nunca rompe el envío si el registro falla. */
export async function logPush(
  admin: { from: (t: string) => any },
  row: PushLogRow,
): Promise<void> {
  try {
    const { error } = await admin.from("push_log").insert(row);
    if (error) console.error("[push] no se pudo registrar", error.message);
  } catch (e) {
    console.error("[push] no se pudo registrar", (e as Error)?.message ?? String(e));
  }
}
