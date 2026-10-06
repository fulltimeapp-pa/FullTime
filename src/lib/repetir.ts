/**
 * Entrenos que se repiten: a partir de unos días de la semana (cada uno con su
 * hora) y un rango de fechas, arma la lista de fechas a crear.
 * Todo en fechas de calendario "YYYY-MM-DD" (sin zona horaria) para que
 * martes siga siendo martes en cualquier celular.
 */

/** 0 = domingo … 6 = sábado (igual que Date.getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type RepeatSlot = { weekday: Weekday; time: string };

export type RepeatDate = { date: string; time: string; weekday: Weekday };

/** Orden en pantalla: lunes primero. */
export const WEEKDAYS: { value: Weekday; short: string; long: string }[] = [
  { value: 1, short: "Lun", long: "Lunes" },
  { value: 2, short: "Mar", long: "Martes" },
  { value: 3, short: "Mié", long: "Miércoles" },
  { value: 4, short: "Jue", long: "Jueves" },
  { value: 5, short: "Vie", long: "Viernes" },
  { value: 6, short: "Sáb", long: "Sábado" },
  { value: 0, short: "Dom", long: "Domingo" },
];

/** Tope para no crear cientos de entrenos por error. */
export const MAX_REPEAT = 60;

function parseDay(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  // Mediodía UTC: así sumar días nunca cruza de fecha por la zona horaria.
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Último día del mes de una fecha "YYYY-MM-DD". */
export function endOfMonth(day: string): string {
  const d = parseDay(day);
  if (!d) return day;
  return formatDay(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12)));
}

/**
 * Fechas entre `from` y `until` (ambas incluidas) que caen en alguno de los
 * días elegidos, cada una con la hora de su día. Ordenadas por fecha.
 * Corta en MAX_REPEAT.
 */
export function buildRepeatDates(from: string, until: string, slots: RepeatSlot[]): RepeatDate[] {
  const start = parseDay(from);
  const end = parseDay(until);
  if (!start || !end || end < start || slots.length === 0) return [];

  const timeByDay = new Map<number, string>();
  for (const s of slots) timeByDay.set(s.weekday, s.time);

  const out: RepeatDate[] = [];
  for (let d = start; d <= end && out.length < MAX_REPEAT; d = new Date(d.getTime() + 86_400_000)) {
    const wd = d.getUTCDay() as Weekday;
    const time = timeByDay.get(wd);
    if (time) out.push({ date: formatDay(d), time, weekday: wd });
  }
  return out;
}

/** "mar 7 oct" para mostrar en la lista. */
export function shortDayLabel(day: string): string {
  const d = parseDay(day);
  if (!d) return day;
  return d.toLocaleDateString("es-PA", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}
