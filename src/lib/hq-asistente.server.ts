/**
 * Asistente del HQ por Telegram, etapa 1 (server-only). Sin inteligencia artificial: reglas fijas.
 * - Resumen de la mañana: desde las 7:00 de Panamá (si el reloj se atrasa, hasta las 10:00), una vez al día.
 * - Aviso 1 hora antes de cada tarea con hora (llamadas y reuniones), una vez por tarea.
 * Lo llama el reloj de recordatorios (cada 15 minutos). Si faltan TELEGRAM_BOT_TOKEN o
 * TELEGRAM_CHAT_ID, no hace nada (todavía no está activado).
 * Solo datos del negocio (tareas, clubes, conversaciones). Nunca datos de jugadoras.
 */
import { fechaPA, horaDelDiaPA } from "./reminders.server";

const PA_OFFSET_MS = 5 * 60 * 60 * 1000;
const MAX_ITEMS = 8;

export type AsistTask = { id: string; title: string; due_date: string | null; due_time: string | null; urgent: boolean; prospect: string | null };
export type AsistProspect = { name: string; team: string | null; next_step: string | null; next_date: string | null; stage: string };
export type AsistConversation = { person: string; last_contact: string; status: string };

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-11-09" → "lunes 9 nov". */
export function diaTexto(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

/** "15:00:00" → "3:00 p. m." */
export function horaTexto(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}

const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/** "[nombre]" de la plantilla → primer nombre de la persona ("David Faroh (Panamá City)" → "David"). */
export function llenarPlantilla(body: string, person: string): string {
  const nombre = person.trim().split(/[\s(]+/)[0] || "";
  return body.replace(/\[nombre\]/gi, nombre);
}

function lista<T>(items: T[], linea: (x: T) => string): string[] {
  const out = items.slice(0, MAX_ITEMS).map(linea);
  if (items.length > MAX_ITEMS) out.push(`  …y ${items.length - MAX_ITEMS} más en el HQ`);
  return out;
}

/** El resumen de la mañana, en texto simple para Telegram. */
export function buildResumen(input: {
  today: string;
  tasks: AsistTask[];
  prospects: AsistProspect[];
  conversations: AsistConversation[];
  seguimiento: string | null; // plantilla "Seguimiento si no responde", si existe
  hqUrl: string | null;
}): string {
  const { today } = input;
  const pend = input.tasks.filter((t) => t.due_date);
  const conHora = pend.filter((t) => t.due_date === today && t.due_time).sort((a, b) => a.due_time!.localeCompare(b.due_time!));
  const hoy = pend.filter((t) => t.due_date === today && !t.due_time).sort((a, b) => Number(b.urgent) - Number(a.urgent));
  const atrasadas = pend.filter((t) => t.due_date! < today).sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.due_date!.localeCompare(b.due_date!));
  const clubes = input.prospects
    .filter((p) => p.next_date && p.next_date <= today && p.stage !== "pagando" && p.stage !== "perdido")
    .sort((a, b) => a.next_date!.localeCompare(b.next_date!));
  const esperando = input.conversations
    .filter((c) => c.status === "esperando" && diasEntre(c.last_contact, today) >= 3)
    .sort((a, b) => a.last_contact.localeCompare(b.last_contact));

  const quien = (t: AsistTask) => (t.prospect ? ` (${t.prospect})` : "");
  const fuego = (t: AsistTask) => (t.urgent ? "🔥 " : "");
  const partes: string[] = [`☀️ Buenos días, Bárbara. Esto es lo de hoy, ${diaTexto(today)}:`];

  if (conHora.length) partes.push(["📞 Llamadas y reuniones", ...lista(conHora, (t) => `• ${horaTexto(t.due_time!)}: ${t.title}${quien(t)}`)].join("\n"));
  if (hoy.length) partes.push(["✅ Tareas de hoy", ...lista(hoy, (t) => `• ${fuego(t)}${t.title}${quien(t)}`)].join("\n"));
  if (atrasadas.length) {
    partes.push([`⏰ Atrasadas (${atrasadas.length})`, ...lista(atrasadas, (t) => `• ${fuego(t)}${t.title}${quien(t)} · era para el ${diaTexto(t.due_date!)}`)].join("\n"));
  }
  if (clubes.length) {
    partes.push(["🤝 Clubes con próximo paso", ...lista(clubes, (p) => `• ${p.name}${p.team ? ` (${p.team})` : ""}: ${p.next_step?.trim() || "revisar en el CRM"}`)].join("\n"));
  }
  if (esperando.length) {
    partes.push([
      "💬 Llevan 3 días o más sin contestarte",
      ...lista(esperando, (c) => {
        const linea = `• ${c.person} · ${diasEntre(c.last_contact, today)} días`;
        return input.seguimiento ? `${linea}\n  Mensaje listo para copiar:\n  ${llenarPlantilla(input.seguimiento, c.person)}` : linea;
      }),
    ].join("\n"));
  }

  if (partes.length === 1) partes.push("Hoy no tienes nada pendiente en el HQ. ¡Aprovecha el día! 💪");
  else partes.push("Los mensajes los mandas tú cuando quieras. Yo solo te los dejo listos.");
  if (input.hqUrl) partes.push(`Abrir el HQ: ${input.hqUrl}`);
  return partes.join("\n\n");
}

/** Tareas con hora que empiezan dentro de la próxima hora (para el aviso), con su referencia única. */
export function avisosPendientes(tasks: AsistTask[], now: Date): { task: AsistTask; ref: string; minutos: number }[] {
  const today = fechaPA(now);
  return tasks
    .filter((t) => t.due_date === today && t.due_time)
    .map((t) => {
      const [h, m] = t.due_time!.split(":").map(Number);
      const empieza = Date.parse(`${today}T00:00:00Z`) + PA_OFFSET_MS + (h * 60 + m) * 60_000;
      return { task: t, ref: `${t.id}|${today}|${t.due_time!.slice(0, 5)}`, minutos: Math.round((empieza - now.getTime()) / 60_000) };
    })
    .filter((a) => a.minutos > 0 && a.minutos <= 60);
}

export function buildAviso(t: AsistTask, minutos: number): string {
  return `⏰ En ${minutos} minutos, a las ${horaTexto(t.due_time!)}:\n${t.title}${t.prospect ? ` (${t.prospect})` : ""}`;
}

/** Ventana del resumen: desde las 7:00 hasta antes de las 10:00 de Panamá. */
export const enVentanaResumen = (now: Date) => {
  const h = horaDelDiaPA(now);
  return h >= 7 && h < 10;
};

export type Boton = { text: string; callback_data: string };
export type Teclado = Boton[][];

/** Llama a la API de Telegram con la clave del bot. */
export async function telegram(method: string, body: Record<string, unknown>): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Falta configurar Telegram");
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Telegram respondió ${res.status}`);
  return res.json();
}

export async function sendTelegram(text: string, teclado?: Teclado): Promise<void> {
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!process.env.TELEGRAM_BOT_TOKEN || !chat) throw new Error("Falta configurar Telegram");
  await telegram("sendMessage", {
    chat_id: chat,
    text: text.slice(0, 4000),
    disable_web_page_preview: true,
    ...(teclado?.length ? { reply_markup: { inline_keyboard: teclado } } : {}),
  });
}

const corto = (t: string, n = 22) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

/** Botones "✅ Hecha" y "➡️ Mañana" por tarea (máximo 8 filas). */
export function botonesTareas(tasks: Pick<AsistTask, "id" | "title">[]): Teclado {
  return tasks.slice(0, MAX_ITEMS).map((t) => [
    { text: `✅ ${corto(t.title)}`, callback_data: `h:${t.id}` },
    { text: "➡️ Mañana", callback_data: `m:${t.id}` },
  ]);
}

/** Las tareas del resumen, en el mismo orden en que salen en el texto. */
export function tareasDelResumen(tasks: AsistTask[], today: string): AsistTask[] {
  const pend = tasks.filter((t) => t.due_date);
  return [
    ...pend.filter((t) => t.due_date === today && t.due_time).sort((a, b) => a.due_time!.localeCompare(b.due_time!)),
    ...pend.filter((t) => t.due_date === today && !t.due_time).sort((a, b) => Number(b.urgent) - Number(a.urgent)),
    ...pend.filter((t) => t.due_date! < today).sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.due_date!.localeCompare(b.due_date!)),
  ];
}

/** Dirección pública del webhook (adonde Telegram manda lo que le escribes a Jarvis). */
export const webhookUrl = () => {
  const site = (process.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");
  return site ? `${site}/api/public/telegram/webhook` : null;
};

/** Contraseña que Telegram manda en cada mensaje al webhook. Sale de la clave del bot (no es otra variable). */
export async function webhookSecret(): Promise<string> {
  const data = new TextEncoder().encode(`fulltime-jarvis:${process.env.TELEGRAM_BOT_TOKEN ?? ""}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 48);
}

/** Deja registrado el webhook en Telegram si todavía no está (lo revisa el reloj). */
async function asegurarWebhook(): Promise<void> {
  const url = webhookUrl();
  if (!url) return;
  const info = await telegram("getWebhookInfo", {});
  if (info?.result?.url === url) return;
  await telegram("setWebhook", { url, secret_token: await webhookSecret(), allowed_updates: ["message", "callback_query"] });
}

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

/** Marca algo como mandado. Devuelve false si ya estaba (otro reloj se adelantó). */
async function marcar(admin: any, kind: "resumen" | "aviso", ref: string): Promise<boolean> {
  const { error } = await admin.from("hq_assistant_log").insert({ kind, ref });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw error;
}

async function desmarcar(admin: any, kind: "resumen" | "aviso", ref: string) {
  await admin.from("hq_assistant_log").delete().eq("kind", kind).eq("ref", ref);
}

/** Tareas pendientes hasta hoy (incluye atrasadas). */
export async function leerTareas(db: any, today: string): Promise<AsistTask[]> {
  const { data, error } = await db
    .from("hq_tasks")
    .select("id, title, due_date, due_time, urgent, prospects(name)")
    .is("done_at", null)
    .lte("due_date", today);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id, title: r.title, due_date: r.due_date, due_time: r.due_time, urgent: !!r.urgent, prospect: r.prospects?.name ?? null,
  }));
}

/** Texto y botones del resumen de hoy. */
export async function armarResumen(db: any, today: string, tasks: AsistTask[]): Promise<{ texto: string; teclado: Teclado }> {
  const [p, c, tpl] = await Promise.all([
    db.from("prospects").select("name, team, next_step, next_date, stage").lte("next_date", today),
    db.from("hq_conversations").select("person, last_contact, status").eq("status", "esperando"),
    db.from("hq_templates").select("name, body").ilike("name", "seguimiento%").limit(1),
  ]);
  if (p.error) throw p.error;
  if (c.error) throw c.error;
  const site = (process.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");
  const texto = buildResumen({
    today, tasks, prospects: p.data ?? [], conversations: c.data ?? [],
    seguimiento: tpl.data?.[0]?.body ?? null, hqUrl: site ? `${site}/hq` : null,
  });
  return { texto, teclado: botonesTareas(tareasDelResumen(tasks, today)) };
}

/** Lo corre el reloj. Devuelve qué mandó (o por qué no). */
export async function runHqAsistente(admin: Admin, now: Date = new Date()): Promise<{ resumen: boolean; avisos: number; estado: string }> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return { resumen: false, avisos: 0, estado: "sin_configurar" };
  const db = admin as any;
  const today = fechaPA(now);

  // Que Telegram sepa adónde mandar lo que le escribes a Jarvis. Si falla, igual sigue con los avisos.
  try {
    await asegurarWebhook();
  } catch (e) {
    console.error("Webhook de Jarvis:", e);
  }

  const tasks = await leerTareas(db, today);

  // Avisos 1 hora antes. Primero se marca (así dos relojes no lo mandan dos veces); si Telegram
  // falla, se desmarca para reintentar en 15 minutos.
  let avisos = 0;
  for (const a of avisosPendientes(tasks, now)) {
    if (!(await marcar(db, "aviso", a.ref))) continue;
    try {
      await sendTelegram(buildAviso(a.task, a.minutos), botonesTareas([a.task]));
      avisos++;
    } catch (e) {
      await desmarcar(db, "aviso", a.ref);
      throw e;
    }
  }

  let resumen = false;
  if (enVentanaResumen(now) && (await marcar(db, "resumen", today))) {
    try {
      const r = await armarResumen(db, today, tasks);
      await sendTelegram(r.texto, r.teclado);
      resumen = true;
    } catch (e) {
      await desmarcar(db, "resumen", today);
      throw e;
    }
  }
  return { resumen, avisos, estado: "ok" };
}
