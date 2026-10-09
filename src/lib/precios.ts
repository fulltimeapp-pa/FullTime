/**
 * Precios de FullTime (los mismos de la portada) y cálculo de cotizaciones.
 * Plan Equipo: $9.99/mes. Plan Academia: 1er equipo $9.99, equipos 2 a 4 $7.99, del 5to $6.99.
 */

export type Plan = "equipo" | "academia";
export type Months = 1 | 3 | 6 | 12;

export const MONTH_OPTIONS: { value: Months; label: string; promo: string }[] = [
  { value: 1, label: "1 mes", promo: "" },
  { value: 3, label: "3 meses", promo: "5% de descuento" },
  { value: 6, label: "6 meses", promo: "10% de descuento" },
  { value: 12, label: "12 meses", promo: "2 meses gratis" },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcAcademia(n: number): number {
  if (n <= 0) return 0;
  let total = 9.99; // 1st
  if (n >= 2) {
    const tier2 = Math.min(n, 4) - 1; // teams 2..4
    total += tier2 * 7.99;
  }
  if (n >= 5) {
    total += (n - 4) * 6.99;
  }
  return round2(total);
}

export function monthlyPrice(plan: Plan, teams: number): number {
  return plan === "equipo" ? 9.99 : calcAcademia(teams);
}

export type QuoteBreakdown = {
  monthly: number;
  subtotal: number; // mensual × meses
  periodDiscount: number; // por pagar varios meses de una vez
  periodLabel: string;
  extraDiscount: number; // descuento especial opcional (%)
  total: number;
};

export function calcQuote(plan: Plan, teams: number, months: Months, extraPct: number): QuoteBreakdown {
  const monthly = monthlyPrice(plan, plan === "equipo" ? 1 : teams);
  const subtotal = round2(monthly * months);
  const periodDiscount =
    months === 12 ? round2(monthly * 2) : months === 6 ? round2(subtotal * 0.1) : months === 3 ? round2(subtotal * 0.05) : 0;
  const periodLabel = MONTH_OPTIONS.find((m) => m.value === months)?.promo ?? "";
  const pct = Math.min(Math.max(extraPct || 0, 0), 100);
  const extraDiscount = round2((subtotal - periodDiscount) * (pct / 100));
  return { monthly, subtotal, periodDiscount, periodLabel, extraDiscount, total: round2(subtotal - periodDiscount - extraDiscount) };
}

export const money = (n: number) => `$${n.toFixed(2)}`;
