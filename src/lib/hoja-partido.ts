/**
 * Hoja de partido: datos del partido, titulares y suplentes, e incidencias con minuto.
 * El resultado y los minutos jugados se calculan aquí (no se guardan), así nunca quedan
 * desfasados si se corrige una incidencia.
 */
import { supabase } from "@/integrations/supabase/client";

export type LineupRole = "titular" | "suplente";
export type EventKind = "gol" | "autogol_rival" | "gol_contra" | "amarilla" | "roja" | "cambio" | "lesion";

export const DURATIONS = [40, 50, 60, 70, 80, 90];

export const EVENT_LABEL: Record<EventKind, string> = {
  gol: "Gol",
  autogol_rival: "Autogol del rival",
  gol_contra: "Gol en contra",
  amarilla: "Amarilla",
  roja: "Roja",
  cambio: "Cambio",
  lesion: "Lesión",
};

export const EVENT_ICON: Record<EventKind, string> = {
  gol: "⚽", autogol_rival: "⚽", gol_contra: "🥅", amarilla: "🟨", roja: "🟥", cambio: "🔁", lesion: "🩹",
};

export type MatchReport = {
  call_up_id: string;
  opponent: string | null;
  competition: string | null; // la escribe el entrenador: "LFF", "Torneo Nacional Sub-16"…
  duration_min: number;
  notes: string | null;
};

export type LineupRow = { call_up_id: string; player_id: string; role: LineupRole };

export type MatchEvent = {
  id: string;
  call_up_id: string;
  kind: EventKind;
  minute: number | null;
  player_id: string | null;
  player_in_id: string | null;
  note: string | null;
  created_at: string;
};

export type NewEvent = Pick<MatchEvent, "kind" | "minute" | "player_id" | "player_in_id" | "note">;

// Tablas nuevas, todavía fuera de los tipos generados de la base.
const reports = () => supabase.from("match_reports" as never) as any;
const lineup = () => supabase.from("match_lineup" as never) as any;
const events = () => supabase.from("match_events" as never) as any;

export async function getMatchSheet(callUpId: string): Promise<{ report: MatchReport | null; lineup: LineupRow[]; events: MatchEvent[] }> {
  const [r, l, e] = await Promise.all([
    reports().select("call_up_id, opponent, competition, duration_min, notes").eq("call_up_id", callUpId).maybeSingle(),
    lineup().select("call_up_id, player_id, role").eq("call_up_id", callUpId),
    events().select("*").eq("call_up_id", callUpId).order("minute", { ascending: true, nullsFirst: false }).order("created_at"),
  ]);
  if (r.error) throw r.error;
  if (l.error) throw l.error;
  if (e.error) throw e.error;
  return { report: r.data as MatchReport | null, lineup: (l.data ?? []) as LineupRow[], events: (e.data ?? []) as MatchEvent[] };
}

/** Duración y competición de la última hoja de esta categoría (para no escribirlas cada vez). */
export async function lastDefaultsFor(categoryId: string): Promise<{ duration: number | null; competition: string | null }> {
  const { data, error } = await reports()
    .select("duration_min, competition, call_ups!inner(category_id)")
    .eq("call_ups.category_id", categoryId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error || !data?.[0]) return { duration: null, competition: null };
  return { duration: data[0].duration_min ?? null, competition: data[0].competition ?? null };
}

export type Competition = { id: string; name: string };

const competitions = () => supabase.from("club_competitions" as never) as any;

/** Lista de competiciones del club (las más nuevas primero). */
export async function listCompetitions(clubId: string): Promise<Competition[]> {
  const { data, error } = await competitions().select("id, name").eq("club_id", clubId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Competition[];
}

/** Agrega una competición; si ya existe con ese nombre, no hace nada. */
export async function addCompetition(clubId: string, name: string): Promise<void> {
  const clean = name.trim();
  if (!clean) throw new Error("Escribe el nombre de la competición.");
  const { error } = await competitions().insert({ club_id: clubId, name: clean });
  if (error && error.code !== "23505") throw error;
}

export async function renameCompetition(id: string, name: string): Promise<void> {
  const clean = name.trim();
  if (!clean) throw new Error("Escribe el nombre de la competición.");
  const { error } = await competitions().update({ name: clean }).eq("id", id);
  if (error?.code === "23505") throw new Error("Ya tienes una competición con ese nombre.");
  if (error) throw error;
}

export async function deleteCompetition(id: string): Promise<void> {
  const { error } = await competitions().delete().eq("id", id);
  if (error) throw error;
}

export async function saveReport(callUpId: string, input: Omit<MatchReport, "call_up_id">, clubId?: string): Promise<void> {
  const clean = { ...input, opponent: input.opponent?.trim() || null, competition: input.competition?.trim() || null, notes: input.notes?.trim() || null };
  // club_id lo pone la base a partir de la convocatoria; se manda cualquiera porque es obligatorio.
  const { error } = await reports().upsert({ call_up_id: callUpId, club_id: "00000000-0000-0000-0000-000000000000", ...clean });
  if (error) throw error;
  // Una competición nueva escrita en la hoja entra sola a la lista del club.
  if (clubId && clean.competition) await addCompetition(clubId, clean.competition).catch(() => {});
}

export async function setLineup(callUpId: string, playerId: string, role: LineupRole | null): Promise<void> {
  const { error } = role
    ? await lineup().upsert({ call_up_id: callUpId, player_id: playerId, role, club_id: "00000000-0000-0000-0000-000000000000" })
    : await lineup().delete().eq("call_up_id", callUpId).eq("player_id", playerId);
  if (error) throw error;
}

export async function addEvent(callUpId: string, ev: NewEvent): Promise<void> {
  const { error } = await events().insert({
    call_up_id: callUpId,
    club_id: "00000000-0000-0000-0000-000000000000",
    kind: ev.kind,
    minute: ev.minute,
    player_id: ev.kind === "autogol_rival" || ev.kind === "gol_contra" ? null : ev.player_id,
    player_in_id: ev.kind === "cambio" ? ev.player_in_id : null,
    note: ev.kind === "lesion" ? ev.note?.trim() || null : null,
  });
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await events().delete().eq("id", id);
  if (error) throw error;
}

export type PlayerLine = {
  playerId: string;
  role: LineupRole | null;
  minutes: number;
  goals: number;
  yellow: number;
  red: number;
  injured: boolean;
  enteredAt: number | null; // suplente que entró
  leftAt: number | null;    // salió (cambio, roja o lesión)
};

export type MatchSummary = { goalsFor: number; goalsAgainst: number; players: Record<string, PlayerLine> };

/**
 * Resultado y minutos jugados.
 * - Titular: está en la cancha desde el 0. Suplente: desde que entra en un cambio.
 * - Sale en un cambio, con roja o lesionada, y puede volver a entrar (cambios ilimitados en
 *   juveniles); se suman todos los ratos que estuvo en la cancha. Con roja ya no vuelve.
 * - Un minuto vacío o mayor que la duración cuenta como el final del partido.
 */
export function summarizeMatch(duration: number, rows: Pick<LineupRow, "player_id" | "role">[], evs: Pick<MatchEvent, "kind" | "minute" | "player_id" | "player_in_id">[]): MatchSummary {
  const clamp = (m: number | null) => (m == null ? duration : Math.min(Math.max(m, 0), duration));
  const players: Record<string, PlayerLine> = {};
  const moves: Record<string, { at: number; on: boolean; final?: boolean }[]> = {};
  const line = (id: string) =>
    (players[id] ??= { playerId: id, role: null, minutes: 0, goals: 0, yellow: 0, red: 0, injured: false, enteredAt: null, leftAt: null });
  const move = (id: string, m: number | null, on: boolean, final = false) => {
    line(id);
    (moves[id] ??= []).push({ at: clamp(m), on, final });
  };

  for (const r of rows) line(r.player_id).role = r.role;

  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const e of evs) {
    switch (e.kind) {
      case "gol": goalsFor++; if (e.player_id) line(e.player_id).goals++; break;
      case "autogol_rival": goalsFor++; break;
      case "gol_contra": goalsAgainst++; break;
      case "amarilla": if (e.player_id) line(e.player_id).yellow++; break;
      case "roja": if (e.player_id) { line(e.player_id).red++; move(e.player_id, e.minute, false, true); } break;
      case "lesion": if (e.player_id) { line(e.player_id).injured = true; move(e.player_id, e.minute, false); } break;
      case "cambio":
        if (e.player_id) move(e.player_id, e.minute, false);
        if (e.player_in_id) move(e.player_in_id, e.minute, true);
        break;
    }
  }

  for (const p of Object.values(players)) {
    // En el mismo minuto, primero la salida y después la entrada.
    const list = (moves[p.playerId] ?? []).sort((a, b) => a.at - b.at || Number(a.on) - Number(b.on));
    let onSince: number | null = p.role === "titular" ? 0 : null;
    let total = 0;
    let expulsada = false;
    for (const mv of list) {
      if (mv.on && onSince == null && !expulsada) {
        onSince = mv.at;
        if (p.enteredAt == null && p.role !== "titular") p.enteredAt = mv.at;
      } else if (!mv.on && onSince != null) {
        total += mv.at - onSince;
        onSince = null;
        p.leftAt = mv.at;
      }
      if (mv.final) expulsada = true;
    }
    if (onSince != null) total += duration - onSince;
    p.minutes = Math.max(0, total);
  }
  return { goalsFor, goalsAgainst, players };
}
