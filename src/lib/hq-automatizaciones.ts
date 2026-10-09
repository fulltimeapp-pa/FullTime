/**
 * FullTime HQ: automatizaciones. Corren solas cuando la dueña abre HQ (no mandan avisos al celular).
 * 1. Conversación esperando respuesta 3 días o más → tarea "Mandar seguimiento a …" para hoy
 *    (una sola vez por cada último contacto; si tocas "Ya le respondí", vuelve a contar desde ahí).
 * 2. Prospecto que se registró en la app (club ligado o mismo correo) → pasa a "En prueba".
 * 3. Prospecto cuyo club ya pagó → pasa a "Pagando".
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  daysFromToday, listClubs, listConversations, listProspects, listTasks, saveTask, todayPA, updateProspectStage,
  type HqClub, type HqConversation, type HqTask, type Prospect, type ProspectStage,
} from "@/lib/hq";

export const SEGUIMIENTO_DIAS = 3;

export type Accion =
  | { kind: "seguimiento"; key: string; text: string; title: string; prospectId: string | null }
  | { kind: "etapa"; key: string; text: string; prospectId: string; stage: ProspectStage; clubId?: string };

const ANTES_DE_PRUEBA: ProspectStage[] = ["contacto", "demo_agendada", "demo_hecha"];

export const seguimientoTitle = (person: string) => `Mandar seguimiento a ${person}`;

/** Decide qué hay que hacer. No cambia nada: solo devuelve la lista. */
export function planAutomatizaciones(
  conversations: HqConversation[], tasks: HqTask[], prospects: Prospect[], clubs: HqClub[],
): Accion[] {
  const acciones: Accion[] = [];
  const norm = (t: string) => t.trim().toLowerCase();

  for (const c of conversations) {
    if (c.status !== "esperando" || -daysFromToday(c.last_contact) < SEGUIMIENTO_DIAS) continue;
    const title = seguimientoTitle(c.person);
    // Ya hay un seguimiento pendiente, o uno creado después del último contacto (aunque esté hecho).
    const yaExiste = tasks.some(
      (t) => norm(t.title) === norm(title) && (!t.done_at || t.created_at.slice(0, 10) >= c.last_contact),
    );
    if (yaExiste) continue;
    tasks = [...tasks, { title, done_at: null, created_at: new Date().toISOString() } as HqTask];
    acciones.push({
      kind: "seguimiento", key: `seg-${c.id}`, title, prospectId: c.prospect_id,
      text: `Creé la tarea "${title}" (lleva ${-daysFromToday(c.last_contact)} días sin responder).`,
    });
  }

  const porId = new Map(clubs.map((c) => [c.club_id, c]));
  const porCorreo = new Map(
    clubs.filter((c) => c.admin_email).map((c) => [c.admin_email!.trim().toLowerCase(), c]),
  );
  const hoy = todayPA();

  for (const p of prospects) {
    if (p.stage === "pagando" || p.stage === "perdido") continue;
    const club = (p.club_id && porId.get(p.club_id)) || (p.email ? porCorreo.get(p.email.trim().toLowerCase()) : undefined);
    if (!club) continue;
    const ligar = p.club_id ? undefined : club.club_id;
    if (club.paid_until && club.paid_until >= hoy) {
      acciones.push({
        kind: "etapa", key: `pago-${p.id}`, prospectId: p.id, stage: "pagando", clubId: ligar,
        text: `${p.name} pasó a "Pagando": su club ${club.club_name} ya pagó.`,
      });
    } else if (ANTES_DE_PRUEBA.includes(p.stage)) {
      acciones.push({
        kind: "etapa", key: `prueba-${p.id}`, prospectId: p.id, stage: "en_prueba", clubId: ligar,
        text: `${p.name} pasó a "En prueba": se registró en la app (${club.club_name}).`,
      });
    }
  }
  return acciones;
}

/** Hace los cambios. Devuelve lo que se pudo hacer y cuántos fallaron. */
export async function aplicarAutomatizaciones(acciones: Accion[]): Promise<{ hechas: Accion[]; fallas: number }> {
  const hechas: Accion[] = [];
  let fallas = 0;
  for (const a of acciones) {
    try {
      if (a.kind === "seguimiento") {
        await saveTask({ title: a.title, due_date: todayPA(), urgent: false, prospect_id: a.prospectId });
      } else {
        await updateProspectStage(a.prospectId, a.stage, a.clubId);
      }
      hechas.push(a);
    } catch (e) {
      console.error("Automatización falló:", a.key, e);
      fallas++;
    }
  }
  return { hechas, fallas };
}

/* Historial en este navegador (para la pantalla Automatizaciones). */
const LOG_KEY = "hq-automatizaciones-log";
export type LogItem = { at: string; text: string };

export function readLog(): LogItem[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]") as LogItem[];
  } catch {
    return [];
  }
}

export function addToLog(items: string[]) {
  if (items.length === 0) return;
  try {
    const at = new Date().toISOString();
    const next = [...items.map((text) => ({ at, text })), ...readLog()].slice(0, 30);
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {
    /* sin almacenamiento: no se guarda el historial */
  }
}

/* Correr al abrir HQ (como mucho una vez cada 10 minutos por pestaña). */

let ultimaVez = 0;
const CADA_MS = 10 * 60 * 1000;

export async function correrAutomatizaciones(qc: ReturnType<typeof useQueryClient>, avisar: boolean) {
  const [conversations, tasks, prospects, clubs] = await Promise.all([
    qc.fetchQuery({ queryKey: ["hq-conversations"], queryFn: listConversations }),
    qc.fetchQuery({ queryKey: ["hq-tasks"], queryFn: listTasks }),
    qc.fetchQuery({ queryKey: ["hq-prospects"], queryFn: listProspects }),
    qc.fetchQuery({ queryKey: ["hq-clubs"], queryFn: listClubs }),
  ]);
  const acciones = planAutomatizaciones(conversations, tasks, prospects, clubs);
  const { hechas, fallas } = await aplicarAutomatizaciones(acciones);
  ultimaVez = Date.now();
  addToLog(hechas.map((a) => a.text));
  if (hechas.length > 0) {
    qc.invalidateQueries({ queryKey: ["hq-tasks"] });
    qc.invalidateQueries({ queryKey: ["hq-prospects"] });
    toast.success(
      hechas.length === 1 ? `Automatización: ${hechas[0].text}` : `Automatizaciones: hice ${hechas.length} cambios. Míralos en Automatizaciones.`,
    );
  } else if (avisar) {
    toast.success("Todo al día: no había nada que mover.");
  }
  if (fallas > 0) toast.error(`${fallas === 1 ? "Una automatización no se pudo hacer" : `${fallas} automatizaciones no se pudieron hacer`}. Se reintenta la próxima vez que abras HQ.`);
  return hechas;
}

/** Se monta en el marco de HQ (solo cuando ya se comprobó que eres la dueña). */
export function AutomatizacionesAlAbrir() {
  const qc = useQueryClient();
  const corriendo = useRef(false);
  useEffect(() => {
    if (corriendo.current || Date.now() - ultimaVez < CADA_MS) return;
    corriendo.current = true;
    correrAutomatizaciones(qc, false)
      .catch((e) => console.error("No se pudieron revisar las automatizaciones:", e))
      .finally(() => { corriendo.current = false; });
  }, [qc]);
  return null;
}

