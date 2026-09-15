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

export function buildCallUpMessage(cu: {
  id: string;
  kind: string;
  starts_at: string;
  place: string | null;
  objetivo: string | null;
}): PushBody {
  const title = cu.kind === "entreno" ? "Nuevo entreno" : "Nueva convocatoria";
  const parts = [formatWhenShort(cu.starts_at)];
  if (cu.place?.trim()) parts.push(cu.place.trim());
  if (cu.kind === "entreno" && cu.objetivo?.trim()) parts.push(cu.objetivo.trim().slice(0, 60));
  return { title, body: parts.join(" · "), url: `/call-ups/${cu.id}` };
}

export async function sendToSubscriptions(
  subs: (WebPushSub & { id: string })[],
  message: PushBody,
  onGone: (ids: string[]) => Promise<void>,
): Promise<{ sent: number; failed: number }> {
  const payload = JSON.stringify(message);
  const gone: string[] = [];
  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      const res = await sendWebPush(sub, payload);
      if (res.ok) sent++;
      else {
        failed++;
        if (res.gone) gone.push(sub.id);
      }
    } catch (e) {
      failed++;
      console.warn("push falló", (e as Error)?.message ?? String(e));
    }
  }

  if (gone.length > 0) await onGone(gone);
  return { sent, failed };
}

