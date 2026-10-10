/**
 * Bienestar y carga (parte 3 de wellness/RPE): historial e informes.
 * - Wellness: puntaje 1–5 (5 = llega muy bien).
 * - Carga del entreno (sRPE): RPE × minutos del entreno (fin − inicio, o 90 si no hay fin).
 * Junta las respuestas nuevas (form_responses) y las de antes (columnas wellness_* y rpe).
 */
import { supabase } from "@/integrations/supabase/client";

export type Entry = {
  playerId: string;
  callUpId: string;
  day: string; // YYYY-MM-DD en Panamá
  categoryId: string;
  kind: "wellness" | "rpe";
  score: number;  // wellness 1–5 / RPE 1–10
  minutes: number;
  load: number;   // solo RPE: score × minutos
  answers?: { label: string; value: unknown }[];
};

const PA = 5 * 3600 * 1000;
export const dayPA = (iso: string) => new Date(new Date(iso).getTime() - PA).toISOString().slice(0, 10);

/** Lunes (YYYY-MM-DD) de la semana de un día. */
export function weekOf(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function addDaysISO(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

export type WeekRow = { week: string; wellness: number | null; rpe: number | null; load: number; respuestas: number };

/** Por semana: wellness promedio, RPE promedio y carga promedio por jugadora que respondió. */
export function weekly(entries: Entry[]): WeekRow[] {
  const weeks = new Map<string, Entry[]>();
  for (const e of entries) weeks.set(weekOf(e.day), [...(weeks.get(weekOf(e.day)) ?? []), e]);
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, es]) => {
      const rpe = es.filter((e) => e.kind === "rpe");
      const players = new Set(rpe.map((e) => e.playerId)).size;
      return {
        week,
        wellness: avg(es.filter((e) => e.kind === "wellness").map((e) => e.score)),
        rpe: avg(rpe.map((e) => e.score)),
        load: players ? Math.round(rpe.reduce((s, e) => s + e.load, 0) / players) : 0,
        respuestas: es.length,
      };
    });
}

export type PlayerRow = {
  playerId: string;
  wellnessAvg: number | null;
  wellnessLast: number | null;
  wellnessCount: number;
  rpeAvg: number | null;
  rpeCount: number;
  loadTotal: number;
  alerts: string[];
};

/**
 * Resumen por jugadora en el periodo, con alertas mirando hacia atrás desde "hoy":
 * - Llega mal: el promedio de sus últimos 3 wellness es 2.5 o menos.
 * - Carga alta: su carga de los últimos 7 días es más de 1.5 veces su promedio semanal de las 3
 *   semanas anteriores (y esas semanas tuvo carga).
 */
export function players(periodEntries: Entry[], allEntries: Entry[], today: string): Record<string, PlayerRow> {
  const out: Record<string, PlayerRow> = {};
  const ids = new Set(periodEntries.map((e) => e.playerId));
  for (const id of ids) {
    const mine = periodEntries.filter((e) => e.playerId === id);
    const w = mine.filter((e) => e.kind === "wellness").sort((a, b) => a.day.localeCompare(b.day));
    const r = mine.filter((e) => e.kind === "rpe");
    const row: PlayerRow = {
      playerId: id,
      wellnessAvg: avg(w.map((e) => e.score)),
      wellnessLast: w.length ? w[w.length - 1].score : null,
      wellnessCount: w.length,
      rpeAvg: avg(r.map((e) => e.score)),
      rpeCount: r.length,
      loadTotal: r.reduce((s, e) => s + e.load, 0),
      alerts: [],
    };

    const all = allEntries.filter((e) => e.playerId === id && e.day <= today);
    const lastW = all.filter((e) => e.kind === "wellness").sort((a, b) => a.day.localeCompare(b.day)).slice(-3);
    const lastAvg = avg(lastW.map((e) => e.score));
    if (lastW.length >= 2 && lastAvg != null && lastAvg <= 2.5) row.alerts.push("Viene llegando mal");

    const loadIn = (from: string, to: string) =>
      all.filter((e) => e.kind === "rpe" && e.day > from && e.day <= to).reduce((s, e) => s + e.load, 0);
    const acute = loadIn(addDaysISO(today, -7), today);
    const chronicWeekly = loadIn(addDaysISO(today, -28), addDaysISO(today, -7)) / 3;
    if (chronicWeekly > 0 && acute > 1.5 * chronicWeekly) row.alerts.push("Carga alta esta semana");

    out[id] = row;
  }
  return out;
}

/** Puntaje de wellness de las respuestas viejas (4 preguntas fijas; molestias cuenta al revés). */
export function legacyWellness(r: { wellness_sleep: number | null; wellness_energy: number | null; wellness_mood: number | null; wellness_soreness: number | null }): number | null {
  const vals = [r.wellness_sleep, r.wellness_energy, r.wellness_mood, r.wellness_soreness == null ? null : 6 - r.wellness_soreness].filter(
    (v): v is number => v != null,
  );
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
}

const minutesOf = (cu: { starts_at: string; ends_at: string | null }) =>
  cu.ends_at ? Math.max(0, Math.round((new Date(cu.ends_at).getTime() - new Date(cu.starts_at).getTime()) / 60000)) : 90;

/** Carga todo el historial visible (el cuerpo técnico: su club; la jugadora: lo suyo). */
export async function loadEntries(clubId: string): Promise<Entry[]> {
  const [nuevas, viejas] = await Promise.all([
    (supabase.from("form_responses" as never) as any)
      .select("player_id, call_up_id, kind, score, answers, call_ups!inner(starts_at, ends_at, category_id)")
      .eq("club_id", clubId),
    supabase
      .from("call_up_players")
      .select("player_id, call_up_id, wellness_sleep, wellness_energy, wellness_mood, wellness_soreness, wellness_at, rpe, call_ups!inner(club_id, kind, starts_at, ends_at, category_id)")
      .eq("call_ups.club_id", clubId)
      .eq("call_ups.kind", "entreno")
      .or("wellness_at.not.is.null,rpe.not.is.null"),
  ]);
  if (nuevas.error) throw nuevas.error;
  if (viejas.error) throw viejas.error;

  const out: Entry[] = [];
  const seen = new Set<string>();
  for (const r of nuevas.data ?? []) {
    if (r.score == null) continue;
    const minutes = minutesOf(r.call_ups);
    const score = Number(r.score);
    seen.add(`${r.call_up_id}|${r.player_id}|${r.kind}`);
    out.push({
      playerId: r.player_id, callUpId: r.call_up_id, day: dayPA(r.call_ups.starts_at), categoryId: r.call_ups.category_id,
      kind: r.kind, score, minutes, load: r.kind === "rpe" ? score * minutes : 0,
      answers: (r.answers ?? []).map((a: any) => ({ label: a.label, value: a.value })),
    });
  }
  for (const r of (viejas.data ?? []) as any[]) {
    const cu = r.call_ups;
    const minutes = minutesOf(cu);
    const w = legacyWellness(r);
    if (r.wellness_at && w != null && !seen.has(`${r.call_up_id}|${r.player_id}|wellness`)) {
      out.push({ playerId: r.player_id, callUpId: r.call_up_id, day: dayPA(cu.starts_at), categoryId: cu.category_id, kind: "wellness", score: w, minutes, load: 0 });
    }
    if (r.rpe != null && !seen.has(`${r.call_up_id}|${r.player_id}|rpe`)) {
      out.push({ playerId: r.player_id, callUpId: r.call_up_id, day: dayPA(cu.starts_at), categoryId: cu.category_id, kind: "rpe", score: r.rpe, minutes, load: r.rpe * minutes });
    }
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}
