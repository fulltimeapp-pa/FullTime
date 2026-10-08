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
      { title: "Notificaciones", to: "/hq/notificaciones", icon: Bell, ready: false },
      { title: "Proyectos", to: "/hq/proyectos", icon: FolderKanban, ready: false },
      { title: "Clientes", to: "/panel-fulltime", icon: Building2, ready: true },
      { title: "Jarvis", to: "/hq/jarvis", icon: Bot, ready: false },
    ],
  },
  {
    group: "Productividad",
    items: [
      { title: "Tareas", to: "/hq/tareas", icon: CheckSquare, ready: false },
      { title: "Calendario", to: "/hq/calendario", icon: CalendarDays, ready: false },
      { title: "Reuniones", to: "/hq/reuniones", icon: Mic, ready: false },
      { title: "Métricas", to: "/panel-fulltime", icon: TrendingUp, ready: true },
    ],
  },
  {
    group: "Redes sociales",
    items: [
      { title: "Contenido", to: "/hq/contenido", icon: Clapperboard, ready: false },
      { title: "Inbox", to: "/hq/inbox", icon: Inbox, ready: false },
      { title: "Automatizaciones", to: "/hq/automatizaciones", icon: Zap, ready: false },
    ],
  },
  {
    group: "Ventas",
    items: [
      { title: "CRM", to: "/hq/crm", icon: Target, ready: true },
      { title: "Cotizaciones", to: "/hq/cotizaciones", icon: FileText, ready: false },
    ],
  },
];
