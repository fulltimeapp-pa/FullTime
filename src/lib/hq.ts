/**
 * FullTime HQ: el centro de control de la dueña de la plataforma.
 * Fase 1: Inicio ("Para hoy"), CRM de prospectos, Clientes y Métricas (estos dos viven
 * todavía en /panel-fulltime). El resto del menú está marcado como "Próximamente".
 */
import {
  Bell, Bot, Building2, CalendarDays, CheckSquare, Clapperboard, FileText, FolderKanban,
  Home, Inbox, Mic, Target, TrendingUp, Zap, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calcQuote, type Months, type Plan } from "@/lib/precios";

export type ProspectStage = "contacto" | "demo_agendada" | "demo_hecha" | "en_prueba" | "pagando" | "perdido";

export const STAGES: { value: ProspectStage; label: string }[] = [
  { value: "contacto", label: "Contacto" },
  { value: "demo_agendada", label: "Demo agendada" },
  { value: "demo_hecha", label: "Demo hecha" },
  { value: "en_prueba", label: "En prueba" },
  { value: "pagando", label: "Pagando" },
  { value: "perdido", label: "Perdido" },
];

export function stageLabel(s: string): string {
  return STAGES.find((x) => x.value === s)?.label ?? s;
}

export type Prospect = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  team: string | null;
  phone: string | null;
  email: string | null;
  stage: ProspectStage;
  next_step: string | null;
  next_date: string | null; // YYYY-MM-DD
  notes: string | null;
  club_id: string | null;
};

export type ProspectInput = Omit<Prospect, "id" | "created_at" | "updated_at">;

/** Fila de platform_overview (clubes registrados). */
export type HqClub = {
  club_id: string;
  club_name: string;
  created_at: string;
  trial_days_left: number;
  admin_name: string | null;
  jugadoras_total: number;
  convocatorias_total: number;
  ultima_actividad: string | null;
  estado: "nuevo" | "activo" | "dormido";
  paid_until?: string | null;
  blocked?: boolean;
};

// La tabla es nueva y todavía no está en los tipos generados de la base.
const prospects = () => supabase.from("prospects" as never) as any;

export async function listProspects(): Promise<Prospect[]> {
  const { data, error } = await prospects().select("*").order("next_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Prospect[];
}

export async function saveProspect(input: ProspectInput, id?: string): Promise<void> {
  const clean = {
    ...input,
    name: input.name.trim(),
    team: input.team?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    next_step: input.next_step?.trim() || null,
    next_date: input.next_date || null,
    notes: input.notes?.trim() || null,
  };
  if (!clean.name) throw new Error("Escribe el nombre del contacto.");
  const q = id ? prospects().update(clean).eq("id", id) : prospects().insert(clean);
  const { error } = await q;
  if (error) throw error;
}

export async function deleteProspect(id: string): Promise<void> {
  const { error } = await prospects().delete().eq("id", id);
  if (error) throw error;
}

export type Meeting = {
  id: string;
  created_at: string;
  title: string;
  meeting_date: string; // YYYY-MM-DD
  attendees: string | null;
  prospect_id: string | null;
  summary: string | null;
  liked: string | null;
  concerns: string | null;
  next_steps: string | null;
};

export type MeetingInput = Omit<Meeting, "id" | "created_at">;

const meetings = () => supabase.from("meetings" as never) as any;

export async function listMeetings(prospectId?: string): Promise<Meeting[]> {
  let q = meetings().select("*").order("meeting_date", { ascending: false }).order("created_at", { ascending: false });
  if (prospectId) q = q.eq("prospect_id", prospectId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Meeting[];
}

export async function saveMeeting(input: MeetingInput, id?: string): Promise<void> {
  const t = (x: string | null) => x?.trim() || null;
  const clean = {
    ...input,
    title: input.title.trim(),
    attendees: t(input.attendees), summary: t(input.summary), liked: t(input.liked),
    concerns: t(input.concerns), next_steps: t(input.next_steps),
  };
  if (!clean.title) throw new Error("Ponle un título a la reunión.");
  if (!clean.meeting_date) throw new Error("Elige la fecha de la reunión.");
  const { error } = await (id ? meetings().update(clean).eq("id", id) : meetings().insert(clean));
  if (error) throw error;
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await meetings().delete().eq("id", id);
  if (error) throw error;
}

/** Actualiza solo la etapa y el próximo paso de un prospecto (desde una reunión). */
export async function updateProspectFollowUp(
  id: string,
  patch: { stage: ProspectStage; next_step: string | null; next_date: string | null },
): Promise<void> {
  const { error } = await prospects()
    .update({ stage: patch.stage, next_step: patch.next_step?.trim() || null, next_date: patch.next_date || null })
    .eq("id", id);
  if (error) throw error;
}

export type HqTask = {
  id: string;
  created_at: string;
  title: string;
  due_date: string | null; // YYYY-MM-DD
  urgent: boolean;
  prospect_id: string | null;
  project_id: string | null;
  position: number | null; // orden manual dentro del proyecto
  done_at: string | null;
};

/** project_id y position son opcionales: si no vienen, al editar no se tocan. */
export type HqTaskInput = Pick<HqTask, "title" | "due_date" | "urgent" | "prospect_id"> & {
  project_id?: string | null;
  position?: number | null;
};

const tasks = () => supabase.from("hq_tasks" as never) as any;

export async function listTasks(): Promise<HqTask[]> {
  const { data, error } = await tasks().select("*").order("due_date", { ascending: true, nullsFirst: false }).order("created_at");
  if (error) throw error;
  return (data ?? []) as HqTask[];
}

export async function saveTask(input: HqTaskInput, id?: string): Promise<void> {
  const clean = { ...input, title: input.title.trim(), due_date: input.due_date || null };
  if (!clean.title) throw new Error("Escribe qué tienes que hacer.");
  const { error } = await (id ? tasks().update(clean).eq("id", id) : tasks().insert(clean));
  if (error) throw error;
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  const { error } = await tasks().update({ done_at: done ? new Date().toISOString() : null }).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await tasks().delete().eq("id", id);
  if (error) throw error;
}

/** Tareas de un proyecto en tu orden (las sin orden van al final, por fecha). */
export function sortByPosition(list: HqTask[]): HqTask[] {
  return [...list].sort(
    (a, b) =>
      (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
      a.created_at.localeCompare(b.created_at),
  );
}

/** Guarda el orden: cada tarea queda en la posición de la lista. Solo actualiza las que cambian. */
export async function reorderTasks(ordered: HqTask[]): Promise<void> {
  const changes = ordered.map((t, i) => ({ t, i })).filter(({ t, i }) => t.position !== i);
  const results = await Promise.all(changes.map(({ t, i }) => tasks().update({ position: i }).eq("id", t.id)));
  const failed = results.find((r: { error: unknown }) => r.error);
  if (failed) throw failed.error;
}

export type ProjectStatus = "activo" | "pausa" | "terminado";

export const PROJECT_STATUS: { value: ProjectStatus; label: string }[] = [
  { value: "activo", label: "Activo" },
  { value: "pausa", label: "En pausa" },
  { value: "terminado", label: "Terminado" },
];

export type HqProject = {
  id: string;
  created_at: string;
  name: string;
  goal: string | null;
  due_date: string | null; // YYYY-MM-DD
  status: ProjectStatus;
};

export type HqProjectInput = Omit<HqProject, "id" | "created_at">;

const projects = () => supabase.from("hq_projects" as never) as any;

export async function listProjects(): Promise<HqProject[]> {
  const { data, error } = await projects().select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as HqProject[];
}

export async function saveProject(input: HqProjectInput, id?: string): Promise<void> {
  const clean = { ...input, name: input.name.trim(), goal: input.goal?.trim() || null, due_date: input.due_date || null };
  if (!clean.name) throw new Error("Ponle un nombre al proyecto.");
  const { error } = await (id ? projects().update(clean).eq("id", id) : projects().insert(clean));
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await projects().delete().eq("id", id);
  if (error) throw error;
}

export type QuoteStatus = "borrador" | "enviada" | "aceptada" | "rechazada";

export const QUOTE_STATUS: { value: QuoteStatus; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "enviada", label: "Enviada" },
  { value: "aceptada", label: "Aceptada" },
  { value: "rechazada", label: "Rechazada" },
];

export type HqQuote = {
  id: string;
  number: number;
  created_at: string;
  client_name: string;
  team: string | null;
  prospect_id: string | null;
  plan: Plan;
  teams: number;
  months: Months;
  extra_discount: number;
  total: number;
  status: QuoteStatus;
  valid_until: string; // YYYY-MM-DD
  notes: string | null;
};

export type HqQuoteInput = Omit<HqQuote, "id" | "number" | "created_at" | "total">;

export const quoteCode = (n: number) => `COT-${String(n).padStart(4, "0")}`;

const quotes = () => supabase.from("hq_quotes" as never) as any;

export async function listQuotes(): Promise<HqQuote[]> {
  const { data, error } = await quotes().select("*").order("number", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((q: HqQuote) => ({ ...q, total: Number(q.total), extra_discount: Number(q.extra_discount) }));
}

export async function getQuote(id: string): Promise<HqQuote | null> {
  const { data, error } = await quotes().select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? { ...data, total: Number(data.total), extra_discount: Number(data.extra_discount) } : null;
}

/** Guarda la cotización con el total calculado en ese momento. Devuelve su id. */
export async function saveQuote(input: HqQuoteInput, id?: string): Promise<string> {
  const teams = input.plan === "equipo" ? 1 : Math.max(1, Math.round(input.teams));
  const clean = {
    ...input,
    client_name: input.client_name.trim(),
    team: input.team?.trim() || null,
    notes: input.notes?.trim() || null,
    teams,
    total: calcQuote(input.plan, teams, input.months, input.extra_discount).total,
  };
  if (!clean.client_name) throw new Error("Escribe a quién va la cotización.");
  if (id) {
    const { error } = await quotes().update(clean).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await quotes().insert(clean).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function setQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  const { error } = await quotes().update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await quotes().delete().eq("id", id);
  if (error) throw error;
}

export type PostNetwork = "instagram" | "tiktok" | "facebook" | "linkedin";
export type PostFormat = "post" | "carrusel" | "reel" | "story";
export type PostStatus = "idea" | "borrador" | "programada" | "publicada";

export const POST_NETWORKS: { value: PostNetwork; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
];
export const POST_FORMATS: { value: PostFormat; label: string }[] = [
  { value: "post", label: "Post" },
  { value: "carrusel", label: "Carrusel" },
  { value: "reel", label: "Reel" },
  { value: "story", label: "Story" },
];
export const POST_STATUS: { value: PostStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "borrador", label: "Borrador" },
  { value: "programada", label: "Programada" },
  { value: "publicada", label: "Publicada" },
];

export type HqPost = {
  id: string;
  created_at: string;
  title: string;
  network: PostNetwork;
  format: PostFormat;
  status: PostStatus;
  publish_date: string | null; // YYYY-MM-DD
  caption: string | null;
  notes: string | null;
};

export type HqPostInput = Omit<HqPost, "id" | "created_at">;

const posts = () => supabase.from("hq_posts" as never) as any;

export async function listPosts(): Promise<HqPost[]> {
  const { data, error } = await posts().select("*").order("publish_date", { ascending: true, nullsFirst: false }).order("created_at");
  if (error) throw error;
  return (data ?? []) as HqPost[];
}

export async function savePost(input: HqPostInput, id?: string): Promise<void> {
  const clean = {
    ...input,
    title: input.title.trim(),
    caption: input.caption?.trim() || null,
    notes: input.notes?.trim() || null,
    publish_date: input.publish_date || null,
  };
  if (!clean.title) throw new Error("Escribe la idea de la publicación.");
  const { error } = await (id ? posts().update(clean).eq("id", id) : posts().insert(clean));
  if (error) throw error;
}

export async function setPostStatus(id: string, status: PostStatus): Promise<void> {
  const { error } = await posts().update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await posts().delete().eq("id", id);
  if (error) throw error;
}

export async function listClubs(): Promise<HqClub[]> {
  const { data, error } = await supabase.rpc("platform_overview");
  if (error) throw error;
  return (data ?? []) as unknown as HqClub[];
}

/** Hoy en Panamá como YYYY-MM-DD. */
export function todayPA(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Días entre hoy y una fecha YYYY-MM-DD (negativo = atrasado). */
export function daysFromToday(day: string): number {
  const a = Date.parse(`${todayPA()}T12:00:00Z`);
  const b = Date.parse(`${day}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export type HqItem = { title: string; to: string; icon: LucideIcon; ready: boolean };

export const HQ_MENU: { group: string; items: HqItem[] }[] = [
  {
    group: "General",
    items: [
      { title: "Inicio", to: "/hq", icon: Home, ready: true },
      { title: "Notificaciones", to: "/hq/notificaciones", icon: Bell, ready: true },
      { title: "Proyectos", to: "/hq/proyectos", icon: FolderKanban, ready: true },
      { title: "Clientes", to: "/panel-fulltime", icon: Building2, ready: true },
      { title: "Jarvis", to: "/hq/jarvis", icon: Bot, ready: false },
    ],
  },
  {
    group: "Productividad",
    items: [
      { title: "Tareas", to: "/hq/tareas", icon: CheckSquare, ready: true },
      { title: "Calendario", to: "/hq/calendario", icon: CalendarDays, ready: true },
      { title: "Reuniones", to: "/hq/reuniones", icon: Mic, ready: true },
      { title: "Métricas", to: "/panel-fulltime", icon: TrendingUp, ready: true },
    ],
  },
  {
    group: "Redes sociales",
    items: [
      { title: "Contenido", to: "/hq/contenido", icon: Clapperboard, ready: true },
      { title: "Inbox", to: "/hq/inbox", icon: Inbox, ready: false },
      { title: "Automatizaciones", to: "/hq/automatizaciones", icon: Zap, ready: false },
    ],
  },
  {
    group: "Ventas",
    items: [
      { title: "CRM", to: "/hq/crm", icon: Target, ready: true },
      { title: "Cotizaciones", to: "/hq/cotizaciones", icon: FileText, ready: true },
    ],
  },
];
