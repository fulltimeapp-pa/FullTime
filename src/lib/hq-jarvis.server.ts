/**
 * Jarvis escucha (server-only): lo que Bárbara le escribe por Telegram y los botones de sus mensajes.
 * Sin inteligencia artificial: entiende un formato simple, "día + hora (opcional) + qué hacer".
 *   hoy 5pm Llamar a Juan · mañana Post del martes · viernes 3:30pm Meet con David · 20/11 Escribirle a Víctor
 * Solo le hace caso a la cuenta de TELEGRAM_CHAT_ID; cualquier otro mensaje se ignora.
 */
import { fechaPA } from "./reminders.server";
import {
  armarResumen, botonesTareas, diaTexto, horaTexto, leerTareas, sendTelegram, telegram, webhookSecret,
} from "./hq-asistente.server";

const DIAS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, miércoles: 3, jueves: 4, viernes: 5, sabado: 6, sábado: 6,
};

const sumarDias = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export type TareaNueva = { title: string; due_date: string; due_time: string | null };

/**
 * "mañana a las 3pm Llamar a Juan" → { title: "Llamar a Juan", due_date: mañana, due_time: "15:00" }.
 * El día va primero. La hora es opcional y va justo después del día; un número solo, sin "a las",
 * ":" ni "am/pm", no se toma como hora (así "mañana 3 posts" no se confunde). Sin "am/pm", de 1 a 6 se entiende de la tarde.
 * Un día de la semana es el próximo (si hoy es lunes, "lunes" es el de la otra semana).
 */
export function parseTarea(texto: string, today: string): TareaNueva | null {
  const t = texto.trim().replace(/^\/tarea\s*/i, "");
  const fecha = /^(?:el\s+)?(pasado\s+ma[nñ]ana|hoy|ma[nñ]ana|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)(?=\s|$)/i.exec(t);
  if (!fecha) return null;
  const palabra = fecha[1].toLowerCase();
  let due: string | null = null;
  if (palabra === "hoy") due = today;
  else if (/^ma[nñ]ana$/.test(palabra)) due = sumarDias(today, 1);
  else if (/^pasado/.test(palabra)) due = sumarDias(today, 2);
  else if (palabra in DIAS) {
    const hoyDia = new Date(`${today}T12:00:00Z`).getUTCDay();
    const diff = (DIAS[palabra] - hoyDia + 7) % 7 || 7;
    due = sumarDias(today, diff);
  } else {
    const [d, m, y] = palabra.split(/[/-]/).map(Number);
    const año = y ? (y < 100 ? 2000 + y : y) : Number(today.slice(0, 4));
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
    let cand = `${año}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (new Date(`${cand}T12:00:00Z`).getUTCDate() !== d) return null; // 31/11 no existe
    if (!y && cand < today) cand = `${año + 1}${cand.slice(4)}`; // "5/1" en noviembre = enero que viene
    due = cand;
  }

  let resto = t.slice(fecha[0].length).trim();
  let hora: string | null = null;
  const h = /^(a\s+las?\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?|am|pm|h|hrs)?(?=\s|$|[,.:-])/i.exec(resto);
  // Es hora si dice "a las", lleva ":" o lleva am/pm/h. Un número solo ("mañana 3 posts") no.
  if (h && (h[1] || h[3] || h[4])) {
    let hh = Number(h[2]);
    const mm = Number(h[3] ?? 0);
    const suf = (h[4] ?? "").toLowerCase().replace(/[.\s]/g, "");
    if (suf === "pm" && hh < 12) hh += 12;
    else if (suf === "am" && hh === 12) hh = 0;
    else if (!suf && hh >= 1 && hh <= 6) hh += 12;
    if (hh > 23 || mm > 59) return null;
    hora = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    resto = resto.slice(h[0].length).trim();
  }
  const title = resto.replace(/^[,.:;-]+\s*/, "").trim().slice(0, 200);
  if (!title) return null;
  return { title: title.charAt(0).toUpperCase() + title.slice(1), due_date: due, due_time: hora };
}

export const AYUDA = [
  "Hola, soy Jarvis 🤖. Escríbeme así para crear una tarea:",
  "",
  "• hoy 5pm Llamar a Juan",
  "• mañana Preparar el post",
  "• viernes 3:30pm Meet con David",
  "• 20/11 Escribirle a Víctor",
  "",
  "Primero el día, después la hora si hay, y después qué hacer.",
  "Con hora, te aviso 1 hora antes.",
  "Escribe /hoy para ver lo de hoy.",
].join("\n");

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

/** Procesa un mensaje o un botón que llegó de Telegram. Nunca lanza error: si algo falla, se lo dice a Bárbara. */
export async function handleTelegramUpdate(update: any, admin: Admin, now: Date = new Date()): Promise<void> {
  const chat = String(process.env.TELEGRAM_CHAT_ID ?? "");
  const db = admin as any;
  const today = fechaPA(now);

  // Botones: "h:<id>" = hecha, "m:<id>" = pasarla a mañana.
  const cb = update?.callback_query;
  if (cb) {
    if (String(cb.from?.id) !== chat) return;
    const [accion, id] = String(cb.data ?? "").split(":");
    let aviso = "No entendí ese botón.";
    try {
      if (accion === "h" && id) {
        const { data, error } = await db.from("hq_tasks").update({ done_at: new Date().toISOString() }).eq("id", id).is("done_at", null).select("title");
        if (error) throw error;
        aviso = data?.length ? `✅ Hecha: ${data[0].title}` : "Esa tarea ya estaba hecha o la borraste.";
      } else if (accion === "m" && id) {
        const manana = sumarDias(today, 1);
        const { data, error } = await db.from("hq_tasks").update({ due_date: manana }).eq("id", id).is("done_at", null).select("title");
        if (error) throw error;
        aviso = data?.length ? `➡️ Pasé a mañana (${diaTexto(manana)}): ${data[0].title}` : "Esa tarea ya estaba hecha o la borraste.";
      }
      // Quitar la fila de botones de esa tarea en el mensaje.
      const filas = (cb.message?.reply_markup?.inline_keyboard ?? []) as any[][];
      const quedan = filas.filter((fila) => !fila.some((b) => String(b.callback_data ?? "").endsWith(`:${id}`)));
      if (cb.message && quedan.length !== filas.length) {
        await telegram("editMessageReplyMarkup", {
          chat_id: cb.message.chat.id, message_id: cb.message.message_id, reply_markup: { inline_keyboard: quedan },
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Jarvis botón:", e);
      aviso = "No pude guardarlo. Vuelve a intentarlo en un momento.";
    }
    await telegram("answerCallbackQuery", { callback_query_id: cb.id, text: aviso }).catch(() => {});
    return;
  }

  // Mensajes de texto: solo de su chat privado.
  const msg = update?.message;
  if (!msg || String(msg.chat?.id) !== chat || typeof msg.text !== "string") return;
  const texto = msg.text.trim();

  try {
    if (/^\/(start|ayuda|help)\b/i.test(texto) || /^ayuda$/i.test(texto)) {
      await sendTelegram(AYUDA);
      return;
    }
    if (/^\/hoy\b/i.test(texto)) {
      const r = await armarResumen(db, today, await leerTareas(db, today));
      await sendTelegram(r.texto.replace(/^☀️ Buenos días, Bárbara\. /, "📋 "), r.teclado);
      return;
    }
    const tarea = parseTarea(texto, today);
    if (!tarea) {
      await sendTelegram(`No entendí 🤔\n\n${AYUDA}`);
      return;
    }
    const { data, error } = await db.from("hq_tasks").insert({ ...tarea, urgent: false }).select("id, title").single();
    if (error) throw error;
    const cuando = `${diaTexto(tarea.due_date)}${tarea.due_time ? ` a las ${horaTexto(tarea.due_time)}` : ""}`;
    await sendTelegram(
      `📌 Anotada para el ${cuando}:\n${tarea.title}${tarea.due_time ? "\n\nTe aviso 1 hora antes." : ""}`,
      botonesTareas([data]),
    );
  } catch (e) {
    console.error("Jarvis mensaje:", e);
    await sendTelegram("No pude guardarlo 😕 Vuelve a intentarlo en un momento.").catch(() => {});
  }
}

/** ¿El pedido viene de verdad de Telegram? (trae la contraseña del webhook). */
export async function esDeTelegram(header: string | null): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !header) return false;
  return header === (await webhookSecret());
}
