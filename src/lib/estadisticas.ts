/**
 * Estadísticas de temporada a partir de las hojas de partido.
 * Solo cuentan los partidos que tienen hoja (los que nadie llenó no se inventan).
 */
import { supabase } from "@/integrations/supabase/client";
import { summarizeMatch, type LineupRow, type MatchEvent, type MatchReport } from "@/lib/hoja-partido";

export type SeasonMatch = {
  callUpId: string;
  startsAt: string;
  categoryId: string;
  report: MatchReport;
  lineup: Pick<LineupRow, "player_id" | "role">[];
  events: Pick<MatchEvent, "kind" | "minute" | "player_id" | "player_in_id">[];
  convocadas: string[]; // player_id de las convocadas que no dijeron "No puedo"
};

export type PlayerSeason = {
  playerId: string;
  convocada: number;
  jugados: number; // partidos con minutos
  titular: number;
  suplenteJugo: number;
  suplenteNoJugo: number;
  minutos: number;
  goles: number;
  amarillas: number;
  rojas: number;
  lesiones: number;
};

export type TeamSeason = {
  partidos: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  golesFavor: number;
  golesContra: number;
  amarillas: number;
  rojas: number;
  golesPorTramo: { tramo: string; favor: number; contra: number }[];
};

const TRAMOS = [[0, 15], [16, 30], [31, 45], [46, 60], [61, 75], [76, 150]] as const;

export function buildSeason(matches: SeasonMatch[]): { team: TeamSeason; players: Record<string, PlayerSeason> } {
  const team: TeamSeason = {
    partidos: 0, ganados: 0, empatados: 0, perdidos: 0, golesFavor: 0, golesContra: 0, amarillas: 0, rojas: 0,
    golesPorTramo: TRAMOS.map(([a, b]) => ({ tramo: b === 150 ? `${a}'+` : `${a}–${b}'`, favor: 0, contra: 0 })),
  };
  const players: Record<string, PlayerSeason> = {};
  const p = (id: string) =>
    (players[id] ??= { playerId: id, convocada: 0, jugados: 0, titular: 0, suplenteJugo: 0, suplenteNoJugo: 0, minutos: 0, goles: 0, amarillas: 0, rojas: 0, lesiones: 0 });

  for (const m of matches) {
    const s = summarizeMatch(m.report.duration_min, m.lineup, m.events);
    team.partidos++;
    team.golesFavor += s.goalsFor;
    team.golesContra += s.goalsAgainst;
    if (s.goalsFor > s.goalsAgainst) team.ganados++;
    else if (s.goalsFor < s.goalsAgainst) team.perdidos++;
    else team.empatados++;

    for (const e of m.events) {
      if (e.kind === "amarilla") team.amarillas++;
      if (e.kind === "roja") team.rojas++;
      if (e.minute != null && (e.kind === "gol" || e.kind === "autogol_rival" || e.kind === "gol_contra")) {
        const i = TRAMOS.findIndex(([a, b]) => e.minute! >= a && e.minute! <= b);
        if (i >= 0) team.golesPorTramo[i][e.kind === "gol_contra" ? "contra" : "favor"]++;
      }
    }

    const ids = new Set([...m.convocadas, ...Object.keys(s.players)]);
    for (const id of ids) {
      const ps = p(id);
      const line = s.players[id];
      ps.convocada++;
      if (!line) continue;
      if (line.minutes > 0) ps.jugados++;
      if (line.role === "titular") ps.titular++;
      if (line.role === "suplente") line.minutes > 0 ? ps.suplenteJugo++ : ps.suplenteNoJugo++;
      ps.minutos += line.minutes;
      ps.goles += line.goals;
      ps.amarillas += line.yellow;
      ps.rojas += line.red;
      if (line.injured) ps.lesiones++;
    }
  }
  return { team, players };
}

/** Carga los partidos con hoja del club (el cuerpo técnico ve todo; la jugadora, solo lo suyo). */
export async function loadSeasonMatches(clubId: string): Promise<SeasonMatch[]> {
  const tbl = (t: string) => supabase.from(t as never) as any;
  const [reports, lineup, events, cups] = await Promise.all([
    tbl("match_reports").select("call_up_id, opponent, competition, duration_min, notes, call_ups!inner(starts_at, category_id)").eq("club_id", clubId),
    tbl("match_lineup").select("call_up_id, player_id, role").eq("club_id", clubId),
    tbl("match_events").select("call_up_id, kind, minute, player_id, player_in_id").eq("club_id", clubId),
    supabase.from("call_up_players").select("call_up_id, player_id, status, call_ups!inner(club_id, kind)").eq("call_ups.club_id", clubId).eq("call_ups.kind", "partido"),
  ]);
  for (const r of [reports, lineup, events, cups]) if (r.error) throw r.error;

  const by = <T extends { call_up_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(r.call_up_id, [...(m.get(r.call_up_id) ?? []), r]);
    return m;
  };
  const lu = by(lineup.data ?? []);
  const ev = by(events.data ?? []);
  const cp = by((cups.data ?? []) as { call_up_id: string; player_id: string; status: string }[]);

  return (reports.data ?? [])
    .map((r: any) => ({
      callUpId: r.call_up_id,
      startsAt: r.call_ups.starts_at,
      categoryId: r.call_ups.category_id,
      report: { call_up_id: r.call_up_id, opponent: r.opponent, competition: r.competition, duration_min: r.duration_min, notes: r.notes },
      lineup: lu.get(r.call_up_id) ?? [],
      events: ev.get(r.call_up_id) ?? [],
      convocadas: (cp.get(r.call_up_id) ?? []).filter((c) => c.status !== "declined").map((c) => c.player_id),
    }))
    .sort((a: SeasonMatch, b: SeasonMatch) => b.startsAt.localeCompare(a.startsAt));
}
