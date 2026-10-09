import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileDown, Plus, Trash2, X } from "lucide-react";
import { HqHeader } from "@/components/hq/HqShell";
import { DateField, formatDayEs } from "@/components/ui/date-field";
import { friendlyError } from "@/lib/errors";
import {
  QUOTE_STATUS, deleteQuote, listProspects, listQuotes, quoteCode, saveQuote, setQuoteStatus, todayPA,
  type HqQuote, type HqQuoteInput, type Prospect, type QuoteStatus,
} from "@/lib/hq";
import { MONTH_OPTIONS, calcQuote, money, type Months, type Plan } from "@/lib/precios";

export const Route = createFileRoute("/_authenticated/hq/cotizaciones")({
  component: HqCotizaciones,
});

const STATUS_STYLE: Record<QuoteStatus, string> = {
  borrador: "bg-ink/10",
  enviada: "bg-lime/50",
  aceptada: "bg-ink text-lime",
  rechazada: "bg-pa-red/15 text-pa-red",
};

function addDaysTo(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function emptyQuote(): HqQuoteInput {
  return {
    client_name: "", team: "", prospect_id: null, plan: "equipo", teams: 1, months: 1,
    extra_discount: 0, status: "borrador", valid_until: addDaysTo(todayPA(), 15), notes: "",
  };
}

const openPdf = (id: string) => window.open(`/cotizacion/${id}`, "_blank");

function HqCotizaciones() {
  const qc = useQueryClient();
  const quotesQ = useQuery({ queryKey: ["hq-quotes"], queryFn: listQuotes });
  const prospectsQ = useQuery({ queryKey: ["hq-prospects"], queryFn: listProspects });
  const [editing, setEditing] = useState<{ id?: string; value: HqQuoteInput } | null>(null);

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) => setQuoteStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hq-quotes"] }),
    onError: (e) => toast.error(friendlyError(e, "No pudimos cambiar el estado. Vuelve a intentarlo.")),
  });

  const items = quotesQ.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:py-10">
      <HqHeader
        title="Cotizaciones"
        subtitle="Arma el precio para un club y mándale el PDF."
        action={
          <button onClick={() => setEditing({ value: emptyQuote() })} className="btn-primary !py-2.5">
            <Plus size={16} /> Nueva cotización
          </button>
        }
      />

      {quotesQ.isError && (
        <p className="mt-6 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          No pudimos cargar tus cotizaciones. Recarga la página.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {quotesQ.isLoading ? (
          <p className="text-sm text-ink/50">Cargando…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink/20 bg-paper p-6 text-center text-sm text-ink/60">
            Todavía no tienes cotizaciones. Toca "Nueva cotización".
          </div>
        ) : (
          items.map((q) => (
            <div key={q.id} className="rounded-2xl border-2 border-ink bg-card p-4 flex flex-wrap items-center gap-3">
              <button onClick={() => setEditing({ id: q.id, value: toInput(q) })} className="min-w-0 flex-1 text-left">
                <p className="font-mono text-xs text-ink/50">{quoteCode(q.number)} · {formatDayEs(q.created_at.slice(0, 10))}</p>
                <p className="font-display text-lg font-bold leading-tight">{q.client_name}{q.team ? ` · ${q.team}` : ""}</p>
                <p className="text-sm text-ink/70">
                  {q.plan === "equipo" ? "Plan Equipo" : `Plan Academia · ${q.teams} equipos`} · {MONTH_OPTIONS.find((m) => m.value === q.months)?.label} · <b>{money(q.total)}</b>
                </p>
              </button>
              <select
                value={q.status}
                onChange={(e) => statusMut.mutate({ id: q.id, status: e.target.value as QuoteStatus })}
                aria-label="Estado"
                className={`rounded-full border-2 border-ink px-3 py-1.5 text-sm font-semibold ${STATUS_STYLE[q.status]}`}
              >
                {QUOTE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button onClick={() => openPdf(q.id)} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-lime/30">
                <FileDown size={14} /> PDF
              </button>
            </div>
          ))
        )}
      </div>

      {editing && (
        <QuoteModal
          id={editing.id}
          initial={editing.value}
          prospects={prospectsQ.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["hq-quotes"] }); }}
        />
      )}
    </div>
  );
}

function toInput(q: HqQuote): HqQuoteInput {
  return {
    client_name: q.client_name, team: q.team ?? "", prospect_id: q.prospect_id, plan: q.plan, teams: q.teams,
    months: q.months, extra_discount: q.extra_discount, status: q.status, valid_until: q.valid_until, notes: q.notes ?? "",
  };
}

const inputCls = "mt-1 w-full rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2.5 outline-none font-normal";

function QuoteModal({ id, initial, prospects, onClose, onSaved }: {
  id?: string; initial: HqQuoteInput; prospects: Prospect[]; onClose: () => void; onSaved: () => void;
}) {
  const [v, setV] = useState<HqQuoteInput>(initial);
  const set = (patch: Partial<HqQuoteInput>) => setV((prev) => ({ ...prev, ...patch }));
  const [error, setError] = useState("");
  const b = calcQuote(v.plan, v.plan === "equipo" ? 1 : v.teams, v.months, v.extra_discount);

  const pickProspect = (pid: string) => {
    const p = prospects.find((x) => x.id === pid);
    set({ prospect_id: pid || null, ...(p && !v.client_name ? { client_name: p.name, team: p.team ?? "" } : {}) });
  };

  const saveMut = useMutation({
    // La pestaña del PDF se abre al tocar el botón (si no, el navegador la bloquea) y se llena al guardar.
    mutationFn: (tab: Window | null) => saveQuote(v, id).then((qid) => ({ qid, tab })),
    onSuccess: ({ qid, tab }) => {
      toast.success("Cotización guardada");
      if (tab) tab.location.href = `/cotizacion/${qid}`;
      onSaved();
    },
    onError: (e, tab) => { tab?.close(); setError(friendlyError(e, "No pudimos guardar. Vuelve a intentarlo.")); },
  });
  const delMut = useMutation({
    mutationFn: () => deleteQuote(id!),
    onSuccess: () => { toast.success("Cotización borrada"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos borrarla. Vuelve a intentarlo.")),
  });

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); setError(""); saveMut.mutate(null); }}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{id ? "Cotización" : "Nueva cotización"}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-semibold">
          <label className="sm:col-span-2">Prospecto del CRM
            <select className={inputCls} value={v.prospect_id ?? ""} onChange={(e) => pickProspect(e.target.value)}>
              <option value="">Ninguno</option>
              {prospects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.team ? ` · ${p.team}` : ""}</option>)}
            </select>
          </label>
          <label>Para (nombre) *
            <input className={inputCls} value={v.client_name} onChange={(e) => set({ client_name: e.target.value })} placeholder="Carlos Rivera" />
          </label>
          <label>Club o equipo
            <input className={inputCls} value={v.team ?? ""} onChange={(e) => set({ team: e.target.value })} placeholder="Inter CF" />
          </label>

          <div className="sm:col-span-2">Plan
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["equipo", "academia"] as Plan[]).map((p) => (
                <button
                  key={p} type="button" onClick={() => set({ plan: p, teams: p === "equipo" ? 1 : Math.max(v.teams, 2) })}
                  className={`rounded-xl border-2 px-3 py-2.5 text-left ${v.plan === p ? "border-ink bg-lime/40" : "border-ink/20 bg-paper"}`}
                >
                  <span className="block font-bold">{p === "equipo" ? "Plan Equipo" : "Plan Academia"}</span>
                  <span className="block text-xs font-normal text-ink/60">{p === "equipo" ? "Un equipo · $9.99/mes" : "Varios equipos · desde $9.99/mes"}</span>
                </button>
              ))}
            </div>
          </div>

          {v.plan === "academia" && (
            <label>¿Cuántos equipos?
              <input
                type="number" min={1} max={50} inputMode="numeric" className={inputCls}
                value={v.teams} onChange={(e) => set({ teams: Math.min(50, Math.max(1, Number(e.target.value) || 1)) })}
              />
            </label>
          )}

          <div className="sm:col-span-2">¿Cuántos meses paga de una vez?
            <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MONTH_OPTIONS.map((m) => (
                <button
                  key={m.value} type="button" onClick={() => set({ months: m.value as Months })}
                  className={`rounded-xl border-2 px-2 py-2 text-center ${v.months === m.value ? "border-ink bg-lime/40" : "border-ink/20 bg-paper"}`}
                >
                  <span className="block font-bold">{m.label}</span>
                  <span className="block text-[11px] font-normal text-ink/60">{m.promo || "precio normal"}</span>
                </button>
              ))}
            </div>
          </div>

          <label>Descuento especial (%)
            <input
              type="number" min={0} max={100} inputMode="decimal" className={inputCls}
              value={v.extra_discount} onChange={(e) => set({ extra_discount: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
            />
            <span className="mt-1 block text-xs font-normal text-ink/50">Opcional. Ej.: 20 para "precio fundador".</span>
          </label>
          <div>Válida hasta
            <DateField value={v.valid_until} onChange={(d) => set({ valid_until: d })} ariaLabel="Válida hasta" className={inputCls} />
          </div>
          <label className="sm:col-span-2">Nota para el club (sale en el PDF)
            <textarea className={`${inputCls} resize-none`} rows={2} value={v.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Incluye acompañamiento para cargar a las jugadoras." />
          </label>
        </div>

        <div className="mt-4 rounded-xl border-2 border-ink bg-card p-3 text-sm">
          <Line label={`${money(b.monthly)} al mes × ${v.months} ${v.months === 1 ? "mes" : "meses"}`} value={money(b.subtotal)} />
          {b.periodDiscount > 0 && <Line label={`Descuento: ${b.periodLabel}`} value={`−${money(b.periodDiscount)}`} />}
          {b.extraDiscount > 0 && <Line label={`Descuento especial (${v.extra_discount}%)`} value={`−${money(b.extraDiscount)}`} />}
          <div className="mt-2 flex justify-between border-t-2 border-ink pt-2 font-display text-xl font-bold">
            <span>Total</span><span>{money(b.total)}</span>
          </div>
        </div>

        {id && (
          <label className="mt-3 block text-sm font-semibold">Estado
            <select className={inputCls} value={v.status} onChange={(e) => set({ status: e.target.value as QuoteStatus })}>
              {QUOTE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        )}

        {error && <p className="mt-3 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">{error}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" disabled={saveMut.isPending} onClick={() => { setError(""); saveMut.mutate(window.open("", "_blank")); }} className="btn-primary">
            <FileDown size={16} /> {saveMut.isPending ? "Guardando…" : "Guardar y ver PDF"}
          </button>
          <button type="submit" disabled={saveMut.isPending} className="btn-ghost">Solo guardar</button>
          {id && (
            <button
              type="button" disabled={delMut.isPending}
              onClick={() => { if (confirm("¿Borrar esta cotización?")) delMut.mutate(); }}
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-pa-red"
            >
              <Trash2 size={14} /> Borrar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 py-0.5"><span className="text-ink/70">{label}</span><span className="font-semibold">{value}</span></div>;
}
