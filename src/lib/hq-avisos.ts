/**
 * FullTime HQ: avisos para la dueña, armados con lo que ya hay en la base (clubes, tareas y CRM).
 * No hay tabla nueva: lo que ya viste se recuerda en este navegador.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { daysFromToday, listClubs, listProspects, listTasks, todayPA, type HqClub, type HqTask, type Prospect } from "@/lib/hq";

export type AvisoKind = "registro" | "prueba" | "pago" | "dormido" | "pendiente";

export type Aviso = {
  key: string; // estable: si ya lo viste, no vuelve a salir como nuevo
  kind: AvisoKind;
  title: string;
  detail: string;
  day: string; // YYYY-MM-DD, para ordenar
  to: string;
  urgent: boolean;
};

const STORAGE_KEY = "hq-avisos-vistos";
const EVENT = "hq-avisos-vistos";

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

/** Arma la lista de avisos (lo urgente primero, luego lo más reciente). */
export function buildAvisos(clubs: HqClub[], tasks: HqTask[], prospects: Prospect[]): Aviso[] {
  const hoy = todayPA();
  const items: Aviso[] = [];

  for (const c of clubs) {
    const creado = c.created_at.slice(0, 10);
    if (daysFromToday(creado) >= -30) {
      items.push({
        key: `registro-${c.club_id}`, kind: "registro", day: creado, to: "/panel-fulltime", urgent: false,
        title: `Nuevo club: ${c.club_name}`,
        detail: `Se registró${c.admin_name ? ` ${c.admin_name}` : ""}. Escríbele para darle la bienvenida.`,
      });
    }
    const pagado = c.paid_until ? daysFromToday(c.paid_until) : null;
    if (!c.blocked && pagado === null) {
      if (c.trial_days_left === 0) {
        items.push({
          key: `prueba-vencida-${c.club_id}`, kind: "prueba", day: hoy, to: "/panel-fulltime", urgent: true,
          title: `Se le venció la prueba a ${c.club_name}`,
          detail: "Todavía no registras su pago. Escríbele o mándale una cotización.",
        });
      } else if (c.trial_days_left <= 3) {
        items.push({
          key: `prueba-${c.club_id}-${c.trial_days_left}`, kind: "prueba", day: hoy, to: "/hq/cotizaciones", urgent: false,
          title: `A ${c.club_name} le quedan ${dias(c.trial_days_left)} de prueba`,
          detail: "Buen momento para mandarle una cotización.",
        });
      }
    }
    if (!c.blocked && pagado !== null && pagado < 0) {
      items.push({
        key: `pago-vencido-${c.club_id}-${c.paid_until}`, kind: "pago", day: c.paid_until!, to: "/panel-fulltime", urgent: true,
        title: `Se le venció el pago a ${c.club_name}`,
        detail: "Escríbele para renovar o registra su pago en Clientes.",
      });
    }
    if (pagado !== null && pagado >= 0 && pagado <= 5) {
      items.push({
        key: `pago-${c.club_id}-${c.paid_until}`, kind: "pago", day: hoy, to: "/panel-fulltime", urgent: pagado <= 1,
        title: `A ${c.club_name} se le vence el pago ${pagado === 0 ? "hoy" : `en ${dias(pagado)}`}`,
        detail: "Recuérdale renovar.",
      });
    }
    if (c.estado === "dormido") {
      items.push({
        key: `dormido-${c.club_id}-${c.ultima_actividad ?? "nunca"}`, kind: "dormido", day: (c.ultima_actividad ?? c.created_at).slice(0, 10),
        to: "/panel-fulltime", urgent: false,
        title: `${c.club_name} dejó de usar la app`,
        detail: "Lleva 3 semanas sin convocar. Pregúntale si necesita ayuda.",
      });
    }
  }

  const tareasAtrasadas = tasks.filter((t) => !t.done_at && t.due_date && daysFromToday(t.due_date) < 0).length;
  if (tareasAtrasadas > 0) {
    items.push({
      key: `tareas-${hoy}-${tareasAtrasadas}`, kind: "pendiente", day: hoy, to: "/hq/tareas", urgent: true,
      title: `Tienes ${tareasAtrasadas} ${tareasAtrasadas === 1 ? "tarea atrasada" : "tareas atrasadas"}`,
      detail: "Márcalas como hechas o cámbiales la fecha.",
    });
  }
  const crmAtrasados = prospects.filter(
    (p) => p.stage !== "pagando" && p.stage !== "perdido" && p.next_date && daysFromToday(p.next_date) < 0,
  ).length;
  if (crmAtrasados > 0) {
    items.push({
      key: `crm-${hoy}-${crmAtrasados}`, kind: "pendiente", day: hoy, to: "/hq/crm", urgent: true,
      title: `${crmAtrasados} ${crmAtrasados === 1 ? "prospecto espera" : "prospectos esperan"} tu seguimiento`,
      detail: "Su próximo paso ya pasó de fecha.",
    });
  }

  items.sort((a, b) => Number(b.urgent) - Number(a.urgent) || (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  return items;
}

export function useHqAvisos() {
  const clubsQ = useQuery({ queryKey: ["hq-clubs"], queryFn: listClubs });
  const tasksQ = useQuery({ queryKey: ["hq-tasks"], queryFn: listTasks });
  const prospectsQ = useQuery({ queryKey: ["hq-prospects"], queryFn: listProspects });

  const [seen, setSeen] = useState<Set<string>>(new Set());
  useEffect(() => {
    const sync = () => setSeen(readSeen());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const items = buildAvisos(clubsQ.data ?? [], tasksQ.data ?? [], prospectsQ.data ?? []);

  const unseen = items.filter((i) => !seen.has(i.key)).length;

  const markAllSeen = () => {
    try {
      // Solo se guardan los avisos de ahora, para que la lista no crezca sin fin.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map((i) => i.key)));
    } catch {
      /* sin almacenamiento: los avisos siguen saliendo como nuevos */
    }
    window.dispatchEvent(new Event(EVENT));
  };

  return {
    items,
    isNew: (a: Aviso) => !seen.has(a.key),
    unseen,
    markAllSeen,
    isLoading: clubsQ.isLoading || tasksQ.isLoading || prospectsQ.isLoading,
    isError: clubsQ.isError || tasksQ.isError || prospectsQ.isError,
  };
}
