import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addDays, addMonths, format, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlayerShell } from "@/components/player/PlayerShell";
import { formatShort } from "@/lib/call-ups";
import { formatDayEs } from "@/components/ui/date-field";

export const Route = createFileRoute("/_authenticated/mi-calendario")({
  head: () => ({ meta: [{ title: "FullTime — Mi calendario" }] }),
  component: MiCalendario,
});

const dayPA = (iso: string) => new Date(new Date(iso).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);
const todayPA = () => dayPA(new Date().toISOString());

type Item = { id: string; kind: "partido" | "entreno"; starts_at: string; ends_at: string | null; meet_at: string | null; place: string | null; status: string };

function MiCalendario() {
  const { user } = Route.useRouteContext();
  const hoy = todayPA();
  const [mes, setMes] = useState(() => startOfMonth(new Date(`${hoy}T12:00:00`)));
  const [dia, setDia] = useState(hoy);

  const q = useQuery({
    queryKey: ["my-calendar", user.id],
    queryFn: async (): Promise<Item[]> => {
      const { data: me, error: meErr } = await supabase.from("players").select("id").eq("user_id", user.id).maybeSingle();
      if (meErr) throw meErr;
      if (!me) return [];
      const { data, error } = await supabase
        .from("call_up_players")
        .select("status, call_ups(id, kind, starts_at, ends_at, meet_at, place)")
        .eq("player_id", me.id);
      if (error) throw error;
      return (data ?? []).filter((r: any) => r.call_ups).map((r: any) => ({ ...r.call_ups, status: r.status }));
    },
  });

  const porDia = new Map<string, Item[]>();
  for (const it of q.data ?? []) {
    const d = dayPA(it.starts_at);
    porDia.set(d, [...(porDia.get(d) ?? []), it].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
  }
  const inicio = startOfWeek(mes, { weekStartsOn: 1 });
  const celdas = Array.from({ length: 42 }, (_, i) => addDays(inicio, i));
  const delDia = porDia.get(dia) ?? [];

  return (
    <PlayerShell>
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-display text-4xl md:text-5xl font-bold leading-[0.95]">
          Mi <span className="marker-underline">calendario</span>
        </h1>

        {q.isError && (
          <p className="mt-4 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">No pudimos cargar tu calendario. Recarga la página.</p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button onClick={() => setMes((m) => addMonths(m, -1))} aria-label="Mes anterior" className="rounded-xl border-2 border-ink p-2"><ChevronLeft size={18} /></button>
          <div className="text-center">
            <p className="font-display text-xl font-bold capitalize">{format(mes, "MMMM yyyy", { locale: es })}</p>
            <button onClick={() => { setMes(startOfMonth(new Date(`${hoy}T12:00:00`))); setDia(hoy); }} className="text-xs font-semibold underline text-ink/60">Ir a hoy</button>
          </div>
          <button onClick={() => setMes((m) => addMonths(m, 1))} aria-label="Mes siguiente" className="rounded-xl border-2 border-ink p-2"><ChevronRight size={18} /></button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-mono uppercase text-ink/50">
          {["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {celdas.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const its = porDia.get(key) ?? [];
            const fuera = d.getMonth() !== mes.getMonth();
            return (
              <button key={key} onClick={() => setDia(key)}
                className={`min-h-14 rounded-xl border-2 p-1 text-left ${key === dia ? "border-ink bg-lime/30" : "border-ink/10 bg-card"} ${fuera ? "opacity-40" : ""}`}>
                <span className={`inline-grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-bold ${key === hoy ? "bg-ink text-paper" : ""}`}>{d.getDate()}</span>
                <div className="mt-0.5 flex flex-wrap gap-0.5">
                  {its.slice(0, 3).map((it) => (
                    <span key={it.id} className={`h-1.5 w-1.5 rounded-full ${it.kind === "partido" ? "bg-pa-red" : "bg-ink"} ${it.status === "declined" ? "opacity-30" : ""}`} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-4 text-xs text-ink/60">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-pa-red" /> Partido</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink" /> Entreno</span>
        </div>

        <section className="mt-6">
          <h2 className="font-display text-lg font-bold capitalize">{formatDayEs(dia, true)}</h2>
          {q.isLoading ? (
            <p className="mt-2 text-sm text-ink/50">Cargando…</p>
          ) : delDia.length === 0 ? (
            <p className="mt-2 text-sm text-ink/60">Nada este día.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {delDia.map((it) => (
                <li key={it.id}>
                  <Link to="/call-ups/$id" params={{ id: it.id }} className="flex items-center gap-3 rounded-xl border-2 border-ink bg-card px-3 py-3 hover:shadow-[3px_3px_0_0_var(--color-lime)]">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${it.kind === "partido" ? "bg-pa-red text-paper" : "bg-lime text-ink"}`}>{it.kind}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{formatShort(it.starts_at, it.ends_at, it.meet_at)}</span>
                      {it.place && <span className="block text-xs text-ink/60">{it.place}</span>}
                    </span>
                    <span className="text-xs font-semibold text-ink/60">{it.status === "going" ? "Voy ✓" : it.status === "declined" ? "No voy" : "Sin responder"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </PlayerShell>
  );
}
