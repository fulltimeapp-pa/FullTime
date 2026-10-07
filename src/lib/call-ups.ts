export type CallUpKind = "partido" | "entreno";
export type ResponseStatus = "pending" | "going" | "declined";

export type CallUp = {
  id: string;
  club_id: string;
  category_id: string;
  kind: CallUpKind;
  starts_at: string;
  ends_at?: string | null;
  meet_at?: string | null;
  place: string;
  note: string | null;
  objetivo: string | null;
  created_by: string;
  created_at: string;
};

export type CallUpPlayerRow = {
  id: string;
  call_up_id: string;
  player_id: string;
  status: ResponseStatus;
  reason: string | null;
  read_at: string | null;
  responded_at: string | null;
  attended: boolean | null;
  attended_at: string | null;
};

export function kindLabel(k: CallUpKind): string {
  return k === "partido" ? "Partido" : "Entreno";
}

function horaCorta(d: Date): string {
  return d.toLocaleTimeString("es-PA", { hour: "numeric", minute: "2-digit", hour12: true });
}

/** "6:30 p. m." o, con fin, "6:30 – 8:00 p. m." (si los dos son p. m. no se repite). */
export function formatTimeRange(startIso: string, endIso?: string | null): string {
  const start = horaCorta(new Date(startIso));
  if (!endIso) return start;
  const end = horaCorta(new Date(endIso));
  const sufijo = (t: string) => t.replace(/^[\d:]+\s*/, "");
  const sinSufijo = (t: string) => t.replace(/\s*[^\d:]+$/, "");
  return sufijo(start) === sufijo(end) ? `${sinSufijo(start)} – ${end}` : `${start} – ${end}`;
}

/** Horas a mostrar: partidos con convocatoria → "Convocatoria 2:00 p. m. · Partido 3:00 p. m.". */
function formatTimes(iso: string, endIso?: string | null, meetIso?: string | null): string {
  if (meetIso) return `Convocatoria ${horaCorta(new Date(meetIso))} · Partido ${horaCorta(new Date(iso))}`;
  return formatTimeRange(iso, endIso);
}

export function formatWhen(iso: string, endIso?: string | null, meetIso?: string | null): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `${date} · ${formatTimes(iso, endIso, meetIso)}`;
}

export function formatShort(iso: string, endIso?: string | null, meetIso?: string | null): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-PA", {
    day: "numeric",
    month: "short",
  }) + " · " + formatTimes(iso, endIso, meetIso);
}

/** "HH:MM" + minutos (sin pasar de 23:59). Para sugerir la hora de fin. */
export function addMinutesToTime(time: string, minutes: number): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return "";
  const total = Math.max(0, Math.min(Number(m[1]) * 60 + Number(m[2]) + minutes, 23 * 60 + 59));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Partido: valida convocatoria (opcional, antes del juego) y hora del juego. */
export function toMatchTimes(date: string, meet: string, kickoff: string): { starts_at: string; meet_at: string | null; ends_at: null } {
  const s = new Date(`${date}T${kickoff}:00`);
  if (Number.isNaN(s.getTime())) throw new Error("Revisa la fecha y la hora del partido.");
  if (!meet) return { starts_at: s.toISOString(), meet_at: null, ends_at: null };
  const m = new Date(`${date}T${meet}:00`);
  if (Number.isNaN(m.getTime()) || m > s) throw new Error("La hora de convocatoria tiene que ser antes del partido.");
  return { starts_at: s.toISOString(), meet_at: m.toISOString(), ends_at: null };
}

/** Valida inicio/fin de un mismo día y devuelve los ISO. Fin es opcional. */
export function toStartEnd(date: string, start: string, end: string): { starts_at: string; ends_at: string | null } {
  const s = new Date(`${date}T${start}:00`);
  if (Number.isNaN(s.getTime())) throw new Error("Revisa la fecha y la hora.");
  if (!end) return { starts_at: s.toISOString(), ends_at: null };
  const e = new Date(`${date}T${end}:00`);
  if (Number.isNaN(e.getTime()) || e <= s) throw new Error("La hora de fin tiene que ser después de la de inicio.");
  return { starts_at: s.toISOString(), ends_at: e.toISOString() };
}
