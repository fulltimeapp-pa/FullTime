/**
 * Descargas para abrir en Excel o Google Sheets. El archivo lleva una marca al inicio para que
 * Excel respete las tildes y la ñ.
 */
export type Cell = string | number | null | undefined;

export function toCsv(head: string[], rows: Cell[][]): string {
  const esc = (v: Cell) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return "﻿" + [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

/** "Asistencia Sub-18 octubre" → "asistencia-sub-18-octubre.csv" (sin tildes ni espacios). */
export function csvName(...parts: (string | null | undefined)[]): string {
  const base = parts
    .filter((p): p is string => !!p && !!p.trim())
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "fulltime"}.csv`;
}

export function downloadCsv(filename: string, head: string[], rows: Cell[][]): void {
  const blob = new Blob([toCsv(head, rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
