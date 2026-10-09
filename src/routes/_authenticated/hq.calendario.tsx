import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addDays, addMonths, format, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { HqHeader } from "@/components/hq/HqShell";
import { formatDayEs } from "@/components/ui/date-field";
import { friendlyError } from "@/lib/errors";
import { listMeetings, listProspects, listTasks, saveTask, setTaskDone, todayPA } from "@/lib/hq";

export const Route = createFileRoute("/_authenticated/hq/calendario")({
  component: HqCalendario,
});

type Kind = "tarea" | "crm" | "reunion";
type Item = { key: string; day: string; kind: Kind; text: string; done?: boolean; taskId?: string; to: string };

const KIND_STYLE: Record<Kind, { dot: string; chip: string; label: string }> = {
  tarea: { dot: "bg-ink", chip: "bg-ink/10", label: "Tarea" },
  crm: { dot: "bg-lime border border-ink", chip: "bg-lime/50", label: "CRM" },
  reunion: { dot: "bg-pa-red", chip: "bg-pa-red/15", label: "Reunión" },
};

const toDay = (d: Date) => format(d, "yyyy-MM-dd");

function HqCalendario() {
  const qc = useQueryClient();
  const tasksQ = useQuery({ queryKey: ["hq-tasks"], queryFn: listTasks });
  const prospectsQ = useQuery({ queryKey: ["hq-prospects"], queryFn: listProspects });
  const meetingsQ = useQuery({ queryKey: ["hq-meetings"], queryFn: () => listMeetings() });

  const hoy = todayPA();
  const [mes, setMes] = useState(() => startOfMonth(new Date(`${hoy}T12:00:00`)));
  const [dia, setDia] = useState(hoy);
  const [nueva, setNueva] = useState("");
  const [abierto, setAbierto] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["hq-tasks"] });
  const addMut = useMutation({
    mutationFn: () => saveTask({ title: nueva, due_date: dia, urgent: false, prospect_id: null }),
    onSuccess: () => { setNueva(""); toast.success("Tarea agregada"); refresh(); },
    onError: (e) => toast.error(friendlyError(e, "No pudimos agregar la tarea. Vuelve a intentarlo.")),
  });
  const doneMut = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setTaskDone(id, done),
    onSuccess: refresh,
    onError: (e) => toast.error(friendlyError(e, "No pudimos marcarla. Vuelve a intentarlo.")),
  });

  const prospects = prospectsQ.data ?? [];
  const nombre = (id: string | null) => prospects.find((p) => p.id === id)?.name;

  const items: Item[] = [
    ...(tasksQ.data ?? []).filter((t) => t.due_date).map((t) => ({
      key: `t-${t.id}`, day: t.due_date!, kind: "tarea" as const, done: !!t.done_at, taskId: t.id, to: "/hq/tareas",
      text: `${t.urgent ? "🔥 " : ""}${t.title}${nombre(t.prospect_id) ? ` · ${nombre(t.prospect_id)}` : ""}`,
    })),
    ...prospects.filter((p) => p.next_date && p.stage !== "pagando" && p.stage !== "perdido").map((p) => ({
      key: `p-${p.id}`, day: p.next_date!, kind: "crm" as const, to: "/hq/crm",
      text: `${p.next_step || "Dar seguimiento"} · ${p.name}`,
    })),
    ...(meetingsQ.data ?? []).map((m) => ({
      key: `m-${m.id}`, day: m.meeting_date, kind: "reunion" as const, to: "/hq/reuniones", text: m.title,
    })),
  ];
  const porDia = new Map<string, Item[]>();
  for (const it of items) porDia.set(it.day, [...(porDia.get(it.day) ?? []), it]);

  // 6 semanas desde el lunes antes del día 1.
  const inicio = startOfWeek(mes, { weekStartsOn: 1 });
  const celdas = Array.from({ length: 42 }, (_, i) => addDays(inicio, i));
  const delDia = porDia.get(dia) ?? [];
  const cargando = tasksQ.isLoading || prospectsQ.isLoading || meetingsQ.isLoading;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:py-10">
      <HqHeader title="Calendario" subtitle="Tus tareas, los próximos pasos del CRM y tus reuniones, por día." />

      {(tasksQ.isError || prospectsQ.isError || meetingsQ.isError) && (
        <p className="mt-6 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          No pudimos cargar todo. Recarga la página.
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button onClick={() => setMes((m) => addMonths(m, -1))} aria-label="Mes anterior" className="rounded-xl border-2 border-ink p-2 hover:bg-lime/30">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="font-display text-xl font-bold capitalize">{format(mes, "MMMM yyyy", { locale: es })}</p>
          <button
            onClick={() => { setMes(startOfMonth(new Date(`${hoy}T12:00:00`))); setDia(hoy); }}
            className="text-xs font-semibold underline text-ink/60"
          >
            Ir a hoy
          </button>
        </div>
        <button onClick={() => setMes((m) => addMonths(m, 1))} aria-label="Mes siguiente" className="rounded-xl border-2 border-ink p-2 hover:bg-lime/30">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-mono uppercase tracking-wider text-ink/50">
        {["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {celdas.map((d) => {
          const key = toDay(d);
          const its = porDia.get(key) ?? [];
          const fuera = d.getMonth() !== mes.getMonth();
          const sel = key === dia;
          return (
            <button
              key={key}
              onClick={() => { setDia(key); setNueva(""); setAbierto(true); }}
              className={`min-h-14 md:min-h-24 rounded-xl border-2 p-1.5 text-left align-top transition-colors ${
                sel ? "border-ink bg-lime/30" : "border-ink/10 bg-card hover:border-ink/40"
              } ${fuera ? "opacity-40" : ""}`}
            >
              <span className={`inline-grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-bold ${key === hoy ? "bg-ink text-paper" : ""}`}>
                {d.getDate()}
              </span>
              {/* Celular: puntitos. Computadora: hasta 2 textos. */}
              <div className="mt-1 flex flex-wrap gap-0.5 md:hidden">
                {its.slice(0, 4).map((it) => <span key={it.key} className={`h-1.5 w-1.5 rounded-full ${KIND_STYLE[it.kind].dot}`} />)}
              </div>
              <div className="mt-1 hidden md:block space-y-0.5">
                {its.slice(0, 2).map((it) => (
                  <p key={it.key} className={`truncate rounded px-1 text-[11px] font-semibold ${KIND_STYLE[it.kind].chip} ${it.done ? "line-through opacity-50" : ""}`}>
                    {it.text}
                  </p>
                ))}
                {its.length > 2 && <p className="px-1 text-[11px] text-ink/50">+{its.length - 2} más</p>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink/60">
        {(Object.keys(KIND_STYLE) as Kind[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${KIND_STYLE[k].dot}`} />{KIND_STYLE[k].label}</span>
        ))}
      </div>

      {abierto && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={() => setAbierto(false)}>
          <section
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold capitalize">{formatDayEs(dia, true)}</h2>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            {cargando ? (
              <p className="mt-3 text-sm text-ink/50">Cargando…</p>
            ) : delDia.length === 0 ? (
              <p className="mt-3 text-sm text-ink/60">Nada para este día.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {delDia.map((it) => (
                  <li key={it.key} className="flex items-center gap-3 rounded-xl border-2 border-ink bg-card px-3 py-2.5">
                    {it.taskId ? (
                      <input
                        type="checkbox" checked={!!it.done}
                        onChange={(e) => doneMut.mutate({ id: it.taskId!, done: e.target.checked })}
                        aria-label="Marcar como hecha" className="h-5 w-5 shrink-0 accent-[var(--color-ink)]"
                      />
                    ) : (
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${KIND_STYLE[it.kind].dot}`} />
                    )}
                    <p className={`min-w-0 flex-1 font-semibold ${it.done ? "line-through text-ink/45" : ""}`}>{it.text}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_STYLE[it.kind].chip}`}>{KIND_STYLE[it.kind].label}</span>
                    <Link to={it.to} className="text-xs font-semibold underline">Abrir</Link>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={(e) => { e.preventDefault(); if (nueva.trim()) addMut.mutate(); }} className="mt-4 flex gap-2">
              <input
                value={nueva} onChange={(e) => setNueva(e.target.value)}
                placeholder="Agregar tarea para este día"
                className="min-w-0 flex-1 rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-4 py-2.5 outline-none"
              />
              <button type="submit" disabled={addMut.isPending || !nueva.trim()} className="btn-primary !py-2.5" aria-label="Agregar tarea">
                <Plus size={18} />
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
