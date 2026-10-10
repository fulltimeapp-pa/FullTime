import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, HeartPulse, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StaffShell } from "@/components/staff/StaffShell";
import { getMyActiveClub } from "@/lib/active-club";
import { friendlyError } from "@/lib/errors";
import { addDaysISO, dayPA, loadEntries, players as playerRows, weekly, type Entry, type WeekRow } from "@/lib/carga";
import { formatDayEs } from "@/components/ui/date-field";

export const Route = createFileRoute("/_authenticated/bienestar")({
  head: () => ({ meta: [{ title: "FullTime — Bienestar y carga" }] }),
  component: () => (
    <StaffShell>
      <BienestarPage />
    </StaffShell>
  ),
});

type Periodo = "4sem" | "mes" | "8sem" | "rango";

function BienestarPage() {
  const hoy = dayPA(new Date().toISOString());
  const [catId, setCatId] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("4sem");
  const [desde, setDesde] = useState(addDaysISO(hoy, -56));
  const [hasta, setHasta] = useState(hoy);
  const [abierta, setAbierta] = useState<string | null>(null);

  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });
  const clubId = clubQ.data?.club_id;
  const catsQ = useQuery({
    queryKey: ["categories", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").eq("club_id", clubId!).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const namesQ = useQuery({
    queryKey: ["stats-players", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("id, full_name, jersey_number, category_id").eq("club_id", clubId!);
      if (error) throw error;
      return data ?? [];
    },
  });
  const entriesQ = useQuery({ queryKey: ["load-entries", clubId], enabled: !!clubId, queryFn: () => loadEntries(clubId!) });

  const [from, to] =
    periodo === "4sem" ? [addDaysISO(hoy, -27), hoy]
    : periodo === "8sem" ? [addDaysISO(hoy, -55), hoy]
    : periodo === "mes" ? [`${hoy.slice(0, 7)}-01`, hoy]
    : [desde, hasta];

  const all = (entriesQ.data ?? []).filter((e) => !catId || e.categoryId === catId);
  const period = all.filter((e) => e.day >= from && e.day <= to);
  const weeks = weekly(period);
  const rows = playerRows(period, all, hoy);
  const name = useMemo(() => {
    const m = new Map((namesQ.data ?? []).map((p) => [p.id, p.full_name]));
    return (id: string) => m.get(id) ?? "Jugadora";
  }, [namesQ.data]);
  const list = Object.values(rows).sort((a, b) => b.alerts.length - a.alerts.length || name(a.playerId).localeCompare(name(b.playerId)));
  const conAlerta = list.filter((r) => r.alerts.length > 0);

  const sel = "rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm font-semibold";

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <span className="chip"><HeartPulse size={12} className="inline-block -mt-0.5" /> Seguimiento</span>
      <h1 className="mt-4 text-display text-4xl md:text-5xl font-bold leading-[0.95]">
        Bienestar y <span className="marker-underline">carga</span>
      </h1>
      <p className="mt-3 text-muted-foreground">
        Sale del wellness y el RPE de los entrenos. Carga = RPE × minutos del entreno.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <select value={catId} onChange={(e) => setCatId(e.target.value)} className={sel} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {(catsQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} className={sel} aria-label="Periodo">
          <option value="4sem">Últimas 4 semanas</option>
          <option value="8sem">Últimas 8 semanas</option>
          <option value="mes">Este mes</option>
          <option value="rango">Elegir fechas (ej. pretemporada)</option>
        </select>
        {periodo === "rango" && (
          <span className="flex items-center gap-1.5 text-sm">
            <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className={sel} aria-label="Desde" />
            a
            <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className={sel} aria-label="Hasta" />
          </span>
        )}
      </div>

      {entriesQ.isError && (
        <p className="mt-6 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          {friendlyError(entriesQ.error, "No pudimos cargar el seguimiento. Recarga la página.")}
        </p>
      )}

      {entriesQ.isLoading ? (
        <p className="mt-8 text-sm text-ink/50">Cargando…</p>
      ) : period.length === 0 ? (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-ink/20 bg-paper p-6 text-center text-sm text-ink/60">
          No hay respuestas de wellness ni RPE en este periodo. Actívalos al crear un entreno y aquí aparece el seguimiento.
        </div>
      ) : (
        <>
          {conAlerta.length > 0 && (
            <section className="mt-8 rounded-2xl border-2 border-pa-red bg-pa-red/5 p-5">
              <h2 className="font-display text-xl font-bold flex items-center gap-2 text-pa-red"><AlertTriangle size={18} /> Para mirar</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {conAlerta.map((r) => (
                  <li key={r.playerId}>
                    <button onClick={() => setAbierta(r.playerId)} className="font-semibold underline">{name(r.playerId)}</button>: {r.alerts.join(" · ")}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <WeekChart title="Wellness promedio por semana" note="De 1 a 5. Más alto = llegan mejor." weeks={weeks} value={(w) => w.wellness} max={5} fmt={(v) => v.toFixed(1)} />
            <WeekChart title="Carga promedio por jugadora, por semana" note="Suma de RPE × minutos de la semana." weeks={weeks} value={(w) => (w.load || null)} max={Math.max(1, ...weeks.map((w) => w.load))} fmt={(v) => String(Math.round(v))} />
          </div>

          <section className="mt-6 rounded-2xl border-2 border-ink bg-card p-5">
            <h2 className="font-display text-xl font-bold">Por jugadora</h2>
            <p className="text-xs text-ink/50">Toca una jugadora para ver su historial día por día.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-ink/50">
                    <th className="py-2">Jugadora</th><th>Wellness prom.</th><th>Último</th><th>RPE prom.</th><th>Carga total</th><th>Alertas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {list.map((r) => (
                    <tr key={r.playerId} className="cursor-pointer hover:bg-ink/5" onClick={() => setAbierta(r.playerId)}>
                      <td className="py-2 font-semibold underline decoration-ink/20">{name(r.playerId)}</td>
                      <td className={r.wellnessAvg != null && r.wellnessAvg <= 2.5 ? "font-bold text-pa-red" : ""}>{r.wellnessAvg ?? "—"}</td>
                      <td>{r.wellnessLast ?? "—"}</td>
                      <td>{r.rpeAvg ?? "—"}</td>
                      <td className="font-mono">{r.loadTotal || "—"}</td>
                      <td className="text-xs font-semibold text-pa-red">{r.alerts.join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {abierta && (
        <Historial name={name(abierta)} entries={all.filter((e) => e.playerId === abierta && e.day >= from && e.day <= to)} onClose={() => setAbierta(null)} />
      )}
    </main>
  );
}

/** Barras por semana, una sola serie. El valor sale al pasar el mouse o tocar, y abajo en texto. */
function WeekChart({ title, note, weeks, value, max, fmt }: {
  title: string; note: string; weeks: WeekRow[]; value: (w: WeekRow) => number | null; max: number; fmt: (v: number) => string;
}) {
  return (
    <section className="rounded-2xl border-2 border-ink bg-card p-5">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <p className="text-xs text-ink/50">{note}</p>
      <div className="mt-4 flex h-40 items-end gap-2 border-b border-ink/20">
        {weeks.map((w) => {
          const v = value(w);
          return (
            <div key={w.week} className="group relative flex h-full flex-1 flex-col justify-end" title={`Semana del ${formatDayEs(w.week)}: ${v == null ? "sin datos" : fmt(v)}`}>
              <span className="mb-1 text-center text-[11px] font-semibold text-ink/70 opacity-0 group-hover:opacity-100">{v == null ? "—" : fmt(v)}</span>
              <div className="mx-auto w-full max-w-10 rounded-t-[4px] bg-ink transition-opacity group-hover:opacity-80"
                style={{ height: v == null ? 0 : `${Math.max(2, (v / max) * 100)}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-2">
        {weeks.map((w) => (
          <span key={w.week} className="flex-1 text-center text-[10px] font-mono text-ink/50">{w.week.slice(8, 10)}/{w.week.slice(5, 7)}</span>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink/60">
        {weeks.map((w) => { const v = value(w); return `${w.week.slice(8, 10)}/${w.week.slice(5, 7)}: ${v == null ? "—" : fmt(v)}`; }).join(" · ")}
      </p>
    </section>
  );
}

function Historial({ name, entries, onClose }: { name: string; entries: Entry[]; onClose: () => void }) {
  const days = [...new Set(entries.map((e) => e.day))].sort().reverse();
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{name}</h3>
          <button onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        {days.length === 0 ? (
          <p className="mt-3 text-sm text-ink/60">Sin respuestas en este periodo.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink/10">
            {days.map((d) => {
              const w = entries.find((e) => e.day === d && e.kind === "wellness");
              const r = entries.find((e) => e.day === d && e.kind === "rpe");
              return (
                <li key={d} className="py-2.5 text-sm">
                  <p className="font-semibold capitalize">{formatDayEs(d, true)}</p>
                  <p className="text-ink/70">
                    {w ? <>Wellness <b className={w.score <= 2.5 ? "text-pa-red" : ""}>{w.score}</b></> : "Sin wellness"}
                    {" · "}
                    {r ? <>RPE <b>{r.score}</b> · {r.minutes} min · carga <b>{r.load}</b></> : "Sin RPE"}
                  </p>
                  {[...(w?.answers ?? []), ...(r?.answers ?? [])].filter((a) => a.value !== null && a.value !== "").length > 0 && (
                    <p className="mt-0.5 text-xs text-ink/50">
                      {[...(w?.answers ?? []), ...(r?.answers ?? [])]
                        .filter((a) => a.value !== null && a.value !== "")
                        .map((a) => `${a.label} ${a.value === true ? "Sí" : a.value === false ? "No" : String(a.value)}`)
                        .join(" · ")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
