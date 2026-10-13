/**
 * Alineación en la cancha: sistemas de juego para fútbol 11, 9 y 7, y dónde cae cada titular.
 * Los lugares van en % de la cancha: x de 0 (izquierda) a 100 (derecha); y de 0 (arco rival)
 * a 100 (arco propio). La cancha se dibuja atacando hacia arriba.
 */
import { supabase } from "@/integrations/supabase/client";

export type FieldSize = 11 | 9 | 7;
export type Line = "portera" | "defensa" | "mediocampista" | "delantera";
export type Slot = { x: number; y: number; line: Line };
export type Spot = { x: number; y: number };

export const FIELD_SIZES: FieldSize[] = [11, 9, 7];

export const FORMATIONS: Record<FieldSize, string[]> = {
  11: ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "5-3-2", "3-4-3"],
  9: ["3-3-2", "3-2-3", "2-4-2", "3-4-1"],
  7: ["2-3-1", "3-2-1", "2-2-2", "3-1-2"],
};

export const defaultFormation = (size: FieldSize) => FORMATIONS[size][0];

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Los lugares de un sistema: la portera y después cada línea, de atrás hacia adelante. */
export function slotsFor(formation: string): Slot[] {
  const lines = formation.split("-").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const slots: Slot[] = [{ x: 50, y: 89, line: "portera" }];
  const back = 74;
  const front = 17;
  lines.forEach((n, i) => {
    const y = lines.length === 1 ? (back + front) / 2 : back - ((back - front) * i) / (lines.length - 1);
    const line: Line = i === 0 ? "defensa" : i === lines.length - 1 ? "delantera" : "mediocampista";
    for (let k = 0; k < n; k++) slots.push({ x: round1((100 * (k + 1)) / (n + 1)), y: round1(y), line });
  });
  return slots;
}

/**
 * Reparte a las titulares en los lugares del sistema. Primero cada una en su línea (la portera al
 * arco, las defensas atrás…); las que sobran o no tienen posición llenan los huecos que queden.
 * Si hay más titulares que lugares, las de más se quedan sin ubicar.
 */
export function autoPlace(formation: string, players: { id: string; position: string | null }[]): Record<string, Spot> {
  const free = slotsFor(formation);
  const out: Record<string, Spot> = {};
  const pending: string[] = [];
  for (const p of players) {
    const i = free.findIndex((s) => s.line === p.position);
    if (i >= 0) {
      const [s] = free.splice(i, 1);
      out[p.id] = { x: s.x, y: s.y };
    } else pending.push(p.id);
  }
  // Las que quedan: de adelante hacia atrás, para no mandar a cualquiera al arco.
  free.reverse();
  for (const id of pending) {
    const s = free.shift();
    if (!s) break;
    out[id] = { x: s.x, y: s.y };
  }
  return out;
}

/** Primer lugar libre del sistema (para una titular nueva), prefiriendo su línea. */
export function firstFreeSpot(formation: string, taken: Spot[], position: string | null): Spot | null {
  const free = slotsFor(formation).filter((s) => !taken.some((t) => Math.hypot(t.x - s.x, t.y - s.y) < 7));
  const s = free.find((f) => f.line === position) ?? [...free].reverse()[0];
  return s ? { x: s.x, y: s.y } : null;
}

/**
 * Lugar de cada titular para dibujar: el guardado, o un lugar libre del sistema para las que
 * todavía no tienen (titulares marcadas antes de que existiera la cancha). Mismo resultado para
 * el cuerpo técnico y para la jugadora, porque el orden sale del id.
 */
export function resolveSpots(formation: string, titulares: { id: string; x: number | null; y: number | null }[]): Record<string, Spot> {
  const out: Record<string, Spot> = {};
  const taken: Spot[] = [];
  for (const t of titulares) {
    if (t.x != null && t.y != null) {
      out[t.id] = { x: t.x, y: t.y };
      taken.push(out[t.id]);
    }
  }
  for (const t of [...titulares].filter((t) => !out[t.id]).sort((a, b) => a.id.localeCompare(b.id))) {
    const s = firstFreeSpot(formation, taken, null);
    if (!s) break;
    out[t.id] = s;
    taken.push(s);
  }
  return out;
}

export type LineupSettings = { field_size: FieldSize; formation: string | null; lineup_published: boolean };

const reports = () => supabase.from("match_reports" as never) as any;
const lineup = () => supabase.from("match_lineup" as never) as any;

/** Guarda de cuántas se juega, el sistema o si la alineación se muestra (la hoja ya tiene que existir). */
export async function saveLineupSettings(callUpId: string, patch: Partial<LineupSettings>): Promise<void> {
  const { data, error } = await reports().update(patch).eq("call_up_id", callUpId).select("call_up_id");
  if (error) throw error;
  if (!data?.length) throw new Error("No pudimos guardar la alineación. Vuelve a intentarlo.");
}

/** Guarda el lugar en la cancha de una o varias titulares (null = se queda sin lugar). */
export async function saveSpots(callUpId: string, spots: Record<string, Spot | null>): Promise<void> {
  const rows = Object.entries(spots).map(([player_id, s]) => ({
    call_up_id: callUpId,
    player_id,
    club_id: "00000000-0000-0000-0000-000000000000", // el club lo pone la base
    role: "titular",
    pos_x: s ? round1(Math.min(100, Math.max(0, s.x))) : null,
    pos_y: s ? round1(Math.min(100, Math.max(0, s.y))) : null,
  }));
  if (rows.length === 0) return;
  const { error } = await lineup().upsert(rows);
  if (error) throw error;
}

export type SharedLineupRow = { player_id: string; short_name: string; jersey_number: number | null; role: "titular" | "suplente"; pos_x: number | null; pos_y: number | null };

/** La alineación que el entrenador decidió mostrar. Si no la publicó, llega vacía. */
export async function getSharedLineup(callUpId: string): Promise<SharedLineupRow[]> {
  const { data, error } = await (supabase.rpc as any)("match_lineup_shared", { _call_up_id: callUpId });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({ ...r, pos_x: r.pos_x == null ? null : Number(r.pos_x), pos_y: r.pos_y == null ? null : Number(r.pos_y) }));
}
