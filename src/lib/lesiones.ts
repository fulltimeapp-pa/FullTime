/**
 * Lesiones de las jugadoras. Datos de salud de menores: los ve y anota solo el cuerpo técnico de su
 * categoría; cada jugadora ve las suyas (lo hace cumplir la base).
 * La figura del cuerpo es propia de FullTime (frente y espalda). El punto se guarda en % de la figura.
 */
import { supabase } from "@/integrations/supabase/client";

export type BodySide = "frente" | "espalda";
export type Laterality = "derecha" | "izquierda" | "centro";

export const ZONES = [
  { value: "cabeza", label: "Cabeza" },
  { value: "cuello", label: "Cuello" },
  { value: "hombro", label: "Hombro" },
  { value: "brazo", label: "Brazo" },
  { value: "codo", label: "Codo" },
  { value: "antebrazo", label: "Antebrazo" },
  { value: "mano", label: "Muñeca o mano" },
  { value: "pecho", label: "Pecho" },
  { value: "abdomen", label: "Abdomen" },
  { value: "espalda_alta", label: "Espalda alta" },
  { value: "espalda_baja", label: "Espalda baja (lumbar)" },
  { value: "cadera_ingle", label: "Cadera o ingle" },
  { value: "gluteo", label: "Glúteo" },
  { value: "muslo_anterior", label: "Muslo de frente (cuádriceps)" },
  { value: "muslo_posterior", label: "Muslo de atrás (isquiotibial)" },
  { value: "aductor", label: "Aductor" },
  { value: "rodilla", label: "Rodilla" },
  { value: "pantorrilla", label: "Pantorrilla (gemelo)" },
  { value: "espinilla", label: "Espinilla" },
  { value: "tobillo", label: "Tobillo" },
  { value: "pie", label: "Pie" },
] as const;
export type Zone = (typeof ZONES)[number]["value"];

export const INJURY_TYPES = [
  { value: "esguince", label: "Esguince" },
  { value: "contractura", label: "Contractura" },
  { value: "desgarro", label: "Desgarro o rotura muscular" },
  { value: "sobrecarga", label: "Sobrecarga" },
  { value: "golpe", label: "Golpe" },
  { value: "tendinitis", label: "Tendinitis" },
  { value: "fractura", label: "Fractura" },
  { value: "luxacion", label: "Luxación" },
  { value: "conmocion", label: "Golpe en la cabeza (conmoción)" },
  { value: "otra", label: "Otra" },
] as const;
export type InjuryType = (typeof INJURY_TYPES)[number]["value"];

export const zoneLabel = (z: string) => ZONES.find((x) => x.value === z)?.label ?? z;
export const typeLabel = (t: string) => INJURY_TYPES.find((x) => x.value === t)?.label ?? t;

export type Injury = {
  id: string;
  player_id: string;
  body_side: BodySide;
  pos_x: number;
  pos_y: number;
  zone: Zone;
  laterality: Laterality;
  injury_type: InjuryType;
  description: string | null;
  injured_on: string;       // YYYY-MM-DD
  expected_return: string | null;
  returned_on: string | null;
};

export type InjuryInput = Omit<Injury, "id" | "player_id">;

/** "Tobillo derecho", "Espalda baja (lumbar)". */
export function zoneText(zone: string, laterality: Laterality): string {
  const base = zoneLabel(zone);
  if (laterality === "centro") return base;
  // Concordancia simple: las zonas que terminan en "a" van en femenino.
  const first = base.split(" ")[0].toLowerCase();
  const fem = /a$/.test(first) || first === "mano";
  const lado = laterality === "derecha" ? (fem ? "derecha" : "derecho") : fem ? "izquierda" : "izquierdo";
  const [head, ...rest] = base.split(" (");
  return `${head} ${lado}${rest.length ? ` (${rest.join(" (")}` : ""}`;
}

/** Sigue lesionada mientras no tenga alta (o si el alta es en el futuro). */
export const isActive = (i: Pick<Injury, "returned_on">, today: string) => !i.returned_on || i.returned_on > today;

/** Días de baja: hasta el alta, o hasta hoy si sigue lesionada. */
export function daysOut(i: Pick<Injury, "injured_on" | "returned_on">, today: string): number {
  const end = i.returned_on && i.returned_on <= today ? i.returned_on : today;
  return Math.max(0, Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${i.injured_on}T12:00:00Z`)) / 86_400_000));
}

/**
 * Zona y lado según dónde se tocó la figura (x, y en % de la figura).
 * De frente, la derecha de la jugadora queda a la izquierda de quien mira; de espalda, al revés.
 * Es una sugerencia: el entrenador la puede cambiar en el formulario.
 */
export function suggestZone(side: BodySide, x: number, y: number): { zone: Zone; laterality: Laterality } {
  const leftHalf = x < 50;
  const lado: Laterality = side === "frente" ? (leftHalf ? "derecha" : "izquierda") : leftHalf ? "izquierda" : "derecha";
  const centro = Math.abs(x - 50) < 5;
  const brazo = x < 31 || x > 69;

  if (y < 11) return { zone: "cabeza", laterality: "centro" };
  if (y < 13.5 && !brazo) return { zone: "cuello", laterality: "centro" };
  if (brazo && y < 49) {
    if (y < 18) return { zone: "hombro", laterality: lado };
    if (y < 27) return { zone: "brazo", laterality: lado };
    if (y < 31) return { zone: "codo", laterality: lado };
    if (y < 41) return { zone: "antebrazo", laterality: lado };
    return { zone: "mano", laterality: lado };
  }
  if (y < 18 && Math.abs(x - 50) > 12) return { zone: "hombro", laterality: lado };
  if (y < 26) return { zone: side === "frente" ? "pecho" : "espalda_alta", laterality: centro ? "centro" : lado };
  if (y < 38) return { zone: side === "frente" ? "abdomen" : "espalda_baja", laterality: centro ? "centro" : lado };
  if (y < 45) return { zone: side === "frente" ? "cadera_ingle" : "gluteo", laterality: centro ? "centro" : lado };
  if (y < 62) {
    if (side === "frente" && centro) return { zone: "aductor", laterality: lado };
    return { zone: side === "frente" ? "muslo_anterior" : "muslo_posterior", laterality: lado };
  }
  if (y < 68) return { zone: "rodilla", laterality: lado };
  if (y < 86) return { zone: side === "frente" ? "espinilla" : "pantorrilla", laterality: lado };
  if (y < 92) return { zone: "tobillo", laterality: lado };
  return { zone: "pie", laterality: lado };
}

/** Cuántas lesiones hubo por zona (para ver patrones), de más a menos. */
export function byZone(list: Pick<Injury, "zone">[]): { zone: Zone; label: string; n: number }[] {
  const m = new Map<Zone, number>();
  for (const i of list) m.set(i.zone, (m.get(i.zone) ?? 0) + 1);
  return [...m.entries()].map(([zone, n]) => ({ zone, label: zoneLabel(zone), n })).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
}

const table = () => supabase.from("player_injuries" as never) as any;
const COLS = "id, player_id, body_side, pos_x, pos_y, zone, laterality, injury_type, description, injured_on, expected_return, returned_on";
const fix = (r: any): Injury => ({ ...r, pos_x: Number(r.pos_x), pos_y: Number(r.pos_y) });

/** Lesiones del club que la persona puede ver (el cuerpo técnico: su categoría; la jugadora: las suyas). */
export async function listInjuries(clubId: string): Promise<Injury[]> {
  const { data, error } = await table().select(COLS).eq("club_id", clubId).order("injured_on", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fix);
}

export async function saveInjury(playerId: string, input: InjuryInput, id?: string): Promise<void> {
  if (!input.injured_on) throw new Error("Pon la fecha en que se lesionó.");
  if (input.expected_return && input.expected_return < input.injured_on) throw new Error("La previsión de alta no puede ser antes de la lesión.");
  if (input.returned_on && input.returned_on < input.injured_on) throw new Error("El alta no puede ser antes de la lesión.");
  const clean = {
    ...input,
    description: input.description?.trim() || null,
    expected_return: input.expected_return || null,
    returned_on: input.returned_on || null,
  };
  const { error } = id
    ? await table().update(clean).eq("id", id)
    : await table().insert({ ...clean, player_id: playerId, club_id: "00000000-0000-0000-0000-000000000000" }); // el club lo pone la base
  if (error) throw error;
}

export async function dischargeInjury(id: string, day: string): Promise<void> {
  const { error } = await table().update({ returned_on: day }).eq("id", id);
  if (error) throw error;
}

export async function deleteInjury(id: string): Promise<void> {
  const { error } = await table().delete().eq("id", id);
  if (error) throw error;
}
