/**
 * Estado de la jugadora además de lesionada: "en duda" o "sancionada".
 * Lo ve y lo anota solo el cuerpo técnico de su categoría; la jugadora ve lo suyo (lo hace cumplir la base).
 */
import { supabase } from "@/integrations/supabase/client";
import { formatDayEs } from "@/components/ui/date-field";

export type StatusKind = "duda" | "sancionada";

export type PlayerStatus = {
  id: string;
  player_id: string;
  status: StatusKind;
  note: string | null;
  matches: number | null; // partidos de sanción
  since: string;          // YYYY-MM-DD
  until: string | null;
  cleared_on: string | null;
};

export type StatusInput = Pick<PlayerStatus, "status" | "note" | "matches" | "since" | "until">;

export const STATUS_LABEL: Record<StatusKind, string> = { duda: "En duda", sancionada: "Sancionada" };
export const STATUS_ICON: Record<StatusKind, string> = { duda: "⚠️", sancionada: "🟥" };

/** Cuenta mientras no se quite a mano y no haya pasado la fecha "hasta". */
export const isStatusActive = (s: Pick<PlayerStatus, "cleared_on" | "until">, today: string) =>
  !s.cleared_on && (!s.until || s.until >= today);

/** "Sancionada · 2 partidos" / "En duda hasta el vie 24 oct". */
export function statusText(s: Pick<PlayerStatus, "status" | "matches" | "until">): string {
  const base = STATUS_LABEL[s.status];
  if (s.status === "sancionada" && s.matches) return `${base} · ${s.matches} ${s.matches === 1 ? "partido" : "partidos"}`;
  if (s.until) return `${base} hasta ${formatDayEs(s.until)}`;
  return base;
}

const table = () => supabase.from("player_statuses" as never) as any;
const COLS = "id, player_id, status, note, matches, since, until, cleared_on";

export async function listStatuses(clubId: string): Promise<PlayerStatus[]> {
  const { data, error } = await table().select(COLS).eq("club_id", clubId).order("since", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PlayerStatus[];
}

export async function saveStatus(playerId: string, input: StatusInput, id?: string): Promise<void> {
  if (!input.since) throw new Error("Pon desde cuándo.");
  if (input.until && input.until < input.since) throw new Error("La fecha \"hasta\" no puede ser antes de \"desde\".");
  if (input.matches != null && (!Number.isInteger(input.matches) || input.matches < 1 || input.matches > 30)) {
    throw new Error("Los partidos de sanción van de 1 a 30.");
  }
  const clean = {
    status: input.status,
    note: input.note?.trim().slice(0, 200) || null,
    matches: input.status === "sancionada" ? input.matches ?? null : null,
    since: input.since,
    until: input.until || null,
  };
  const { error } = id
    ? await table().update(clean).eq("id", id)
    : await table().insert({ ...clean, player_id: playerId, club_id: "00000000-0000-0000-0000-000000000000" }); // el club lo pone la base
  if (error) throw error;
}

/** "Ya está disponible": se quita hoy y queda en el historial. Si todavía no había empezado, se borra. */
export async function clearStatus(st: Pick<PlayerStatus, "id" | "since">, day: string): Promise<void> {
  if (st.since > day) return deleteStatus(st.id);
  const { error } = await table().update({ cleared_on: day }).eq("id", st.id);
  if (error) throw error;
}

export async function deleteStatus(id: string): Promise<void> {
  const { error } = await table().delete().eq("id", id);
  if (error) throw error;
}
