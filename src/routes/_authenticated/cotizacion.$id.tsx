import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { formatDayEs } from "@/components/ui/date-field";
import { getQuote, quoteCode } from "@/lib/hq";
import { MONTH_OPTIONS, calcQuote, money } from "@/lib/precios";

export const Route = createFileRoute("/_authenticated/cotizacion/$id")({
  component: CotizacionPdf,
});

// Al imprimir solo sale la hoja (se ocultan avisos y botones de la app).
const PRINT_CSS = `
@page { size: Letter; margin: 0; }
@media print {
  body * { visibility: hidden !important; }
  .hoja-cot, .hoja-cot * { visibility: visible !important; }
  .hoja-cot { position: absolute; inset: 0; box-shadow: none !important; margin: 0 !important; border: 0 !important; border-radius: 0 !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

function CotizacionPdf() {
  const { id } = Route.useParams();
  // Solo la dueña puede leer cotizaciones (la base no se las da a nadie más).
  const q = useQuery({ queryKey: ["hq-quote", id], queryFn: () => getQuote(id) });
  const quote = q.data;

  useEffect(() => {
    if (quote) document.title = `Cotización ${quoteCode(quote.number)} · FullTime`;
  }, [quote]);

  if (q.isLoading) return <div className="min-h-screen bg-background p-10 text-ink/50">Cargando…</div>;
  if (q.isError || !quote)
    return (
      <div className="min-h-screen bg-background p-10">
        <p className="font-semibold text-pa-red">
          {q.isError ? "No pudimos cargar la cotización. Recarga la página." : "No encontramos esta cotización."}
        </p>
      </div>
    );

  const b = calcQuote(quote.plan, quote.teams, quote.months, quote.extra_discount);
  const meses = MONTH_OPTIONS.find((m) => m.value === quote.months)?.label ?? `${quote.months} meses`;
  const planNombre = quote.plan === "equipo" ? "Plan Equipo" : "Plan Academia";

  return (
    <div className="min-h-screen bg-ink/10 py-8 print:py-0">
      <style>{PRINT_CSS}</style>

      <div className="mx-auto mb-4 flex max-w-[8.5in] items-center justify-between gap-3 px-4 print:hidden">
        <p className="text-sm text-ink/70">Toca <b>Descargar PDF</b> y elige <b>"Guardar como PDF"</b>.</p>
        <button onClick={() => window.print()} className="btn-primary !py-2.5">
          <Printer size={16} /> Descargar PDF
        </button>
      </div>

      <div className="hoja-cot mx-auto flex min-h-[11in] w-full max-w-[8.5in] flex-col bg-paper p-[0.6in] text-ink shadow-[6px_6px_0_0_var(--color-ink)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-12" />
            <span className="font-display text-2xl font-bold">FullTime<span className="text-pa-red">.</span></span>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs uppercase tracking-widest text-ink/50">Cotización</p>
            <p className="font-display text-xl font-bold">{quoteCode(quote.number)}</p>
            <p className="text-sm text-ink/70">{formatDayEs(quote.created_at.slice(0, 10))}</p>
          </div>
        </div>

        <div className="mt-10">
          <p className="font-mono text-xs uppercase tracking-widest text-ink/50">Para</p>
          <p className="font-display text-3xl font-bold leading-tight">{quote.client_name}</p>
          {quote.team && <p className="text-lg text-ink/70">{quote.team}</p>}
        </div>

        <div className="mt-8 rounded-2xl border-2 border-ink bg-card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-2xl font-bold">{planNombre}</p>
            <p className="text-sm text-ink/70">
              {quote.plan === "academia" ? `${quote.teams} equipos · ` : "1 equipo · "}pago de {meses}
            </p>
          </div>
          <p className="mt-1 text-sm text-ink/70">
            Convocatorias y entrenos con aviso al celular de cada jugadora, confirmación de asistencia,
            recordatorios automáticos y porcentaje de asistencia.
            {quote.plan === "equipo" ? " Hasta 25 jugadoras y 2 cupos de cuerpo técnico." : " Cada equipo con su plantel y su cuerpo técnico."}
          </p>

          <div className="mt-6 space-y-2 text-[15px]">
            <Row label={`${money(b.monthly)} al mes × ${quote.months} ${quote.months === 1 ? "mes" : "meses"}`} value={money(b.subtotal)} />
            {b.periodDiscount > 0 && <Row label={`Descuento por pagar ${meses}: ${b.periodLabel}`} value={`−${money(b.periodDiscount)}`} />}
            {b.extraDiscount > 0 && <Row label={`Descuento especial (${quote.extra_discount}%)`} value={`−${money(b.extraDiscount)}`} />}
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t-2 border-ink pt-4">
            <span className="font-display text-xl font-bold">Total a pagar</span>
            <span className="font-display text-4xl font-bold">{money(quote.total)}</span>
          </div>
          {quote.months > 1 && (
            <p className="mt-1 text-right text-sm text-ink/60">Equivale a {money(quote.total / quote.months)} al mes · un solo pago</p>
          )}
        </div>

        {quote.notes && (
          <div className="mt-6 rounded-xl border-2 border-dashed border-ink bg-lime/30 px-4 py-3 text-sm">
            {quote.notes}
          </div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 text-sm">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink/50">Cómo pagar</p>
            <p className="mt-1"><b>Yappy</b> al <b>+507 6991-1552</b>.</p>
            <p className="mt-1 text-ink/70">¿Prefieres transferencia? Escríbenos y te pasamos los datos.</p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink/50">Validez</p>
            <p className="mt-1">Precio válido hasta el <b>{formatDayEs(quote.valid_until)}</b>.</p>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between border-t-2 border-ink pt-4 text-sm">
          <div>
            <p className="font-display font-bold">¿Dudas? Escríbeme</p>
            <p className="text-ink/70">Bárbara · FullTime</p>
          </div>
          <div className="text-right">
            <p>WhatsApp <b>+507 6991-1552</b></p>
            <p className="text-ink/70">fulltimeapp.pa@gmail.com · fulltimeapp.vercel.app</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink/70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
