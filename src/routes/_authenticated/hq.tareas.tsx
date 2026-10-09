import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Flame, Plus, Trash2, X } from "lucide-react";
import { HqHeader } from "@/components/hq/HqShell";
import { DateField, formatDayEs } from "@/components/ui/date-field";
import { friendlyError } from "@/lib/errors";
import {
  daysFromToday, deleteTask, listProspects, listTasks, saveTask, setTaskDone, todayPA,
  type HqTask, type HqTaskInput, type Prospect,
} from "@/lib/hq";

export const Route = createFileRoute("/_authenticated/hq/tareas")({
  component: HqTareas,
});

function HqTareas() {
  const qc = useQueryClient();
  const tasksQ = useQuery({ queryKey: ["hq-tasks"], queryFn: listTasks });
  const prospectsQ = useQuery({ queryKey: ["hq-prospects"], queryFn: listProspects });
  const prospects = prospectsQ.data ?? [];
  const [nueva, setNueva] = useState("");
  const [editing, setEditing] = useState<HqTask | null>(null);
  const [verHechas, setVerHechas] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["hq-tasks"] });

  // Escribir y Enter: queda lista para hoy.
  const addMut = useMutation({
    mutationFn: () => saveTask({ title: nueva, due_date: todayPA(), urgent: false, prospect_id: null }),
    onSuccess: () => { setNueva(""); refresh(); },
    onError: (e) => toast.error(friendlyError(e, "No pudimos agregar la tarea. Vuelve a intentarlo.")),
  });
  const doneMut = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setTaskDone(id, done),
    onSuccess: (_d, { done }) => { if (done) toast.success("¡Hecha! ✅"); refresh(); },
    onError: (e) => toast.error(friendlyError(e, "No pudimos marcarla. Vuelve a intentarlo.")),
  });

  const all = tasksQ.data ?? [];
  const pendientes = all.filter((t) => !t.done_at);
  const grupos = [
    { title: "Atrasadas", items: pendientes.filter((t) => t.due_date && daysFromToday(t.due_date) < 0), late: true },
    { title: "Hoy", items: pendientes.filter((t) => t.due_date && daysFromToday(t.due_date) === 0), late: false },
    { title: "Próximas", items: pendientes.filter((t) => !t.due_date || daysFromToday(t.due_date) > 0), late: false },
  ];
  const hechas = all.filter((t) => t.done_at).sort((a, b) => (b.done_at! > a.done_at! ? 1 : -1));
  const nombre = (id: string | null) => prospects.find((p) => p.id === id)?.name;

  const row = (t: HqTask, late = false) => {
    const done = !!t.done_at;
    return (
      <li key={t.id} className="flex items-center gap-3 rounded-xl border-2 border-ink bg-card px-3 py-2.5">
        <button
          onClick={() => doneMut.mutate({ id: t.id, done: !done })}
          aria-label={done ? "Marcar como pendiente" : "Marcar como hecha"}
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-ink ${done ? "bg-lime" : "bg-paper hover:bg-lime/40"}`}
        >
          {done && <Check size={16} strokeWidth={3} />}
        </button>
        <button onClick={() => setEditing(t)} className="min-w-0 flex-1 text-left">
          <p className={`font-semibold leading-tight ${done ? "line-through text-ink/45" : ""}`}>
            {t.urgent && !done && <Flame size={14} className="inline -mt-0.5 mr-1 text-pa-red" />}
            {t.title}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-ink/60">
            {t.due_date && <span className={late ? "font-semibold text-pa-red" : ""}>{formatDayEs(t.due_date)}</span>}
            {nombre(t.prospect_id) && <span>· {nombre(t.prospect_id)}</span>}
          </p>
        </button>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:py-10">
      <HqHeader title="Tareas" subtitle="Tus pendientes del negocio. Lo de hoy y lo atrasado sale en Inicio." />

      <form
        onSubmit={(e) => { e.preventDefault(); if (nueva.trim()) addMut.mutate(); }}
        className="mt-6 flex gap-2"
      >
        <input
          value={nueva} onChange={(e) => setNueva(e.target.value)}
          placeholder="¿Qué tienes que hacer hoy? Escribe y dale Enter"
          className="min-w-0 flex-1 rounded-xl border-2 border-ink bg-paper px-4 py-3 outline-none focus:shadow-[3px_3px_0_0_var(--color-ink)]"
        />
        <button type="submit" disabled={addMut.isPending || !nueva.trim()} className="btn-primary !py-2.5" aria-label="Agregar tarea">
          <Plus size={18} />
        </button>
      </form>

      {tasksQ.isError && (
        <p className="mt-6 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          No pudimos cargar tus tareas. Recarga la página.
        </p>
      )}

      {tasksQ.isLoading ? (
        <p className="mt-6 text-sm text-ink/50">Cargando…</p>
      ) : pendientes.length === 0 ? (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-ink/20 bg-paper p-6 text-center text-sm text-ink/60">
          No tienes pendientes. 🎉
        </p>
      ) : (
        grupos.filter((g) => g.items.length > 0).map((g) => (
          <section key={g.title} className="mt-6">
            <h2 className={`font-display text-lg font-bold ${g.late ? "text-pa-red" : ""}`}>
              {g.title} <span className="font-mono text-xs text-ink/50">{g.items.length}</span>
            </h2>
            <ul className="mt-2 space-y-2">{g.items.map((t) => row(t, g.late))}</ul>
          </section>
        ))
      )}

      {hechas.length > 0 && (
        <section className="mt-8">
          <button onClick={() => setVerHechas((v) => !v)} className="text-sm font-semibold underline">
            {verHechas ? "Ocultar hechas" : `Ver hechas (${hechas.length})`}
          </button>
          {verHechas && <ul className="mt-2 space-y-2">{hechas.map((t) => row(t))}</ul>}
        </section>
      )}

      {editing && (
        <TaskModal
          task={editing}
          prospects={prospects}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

const inputCls = "mt-1 w-full rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2.5 outline-none font-normal";

function TaskModal({ task, prospects, onClose, onSaved }: {
  task: HqTask; prospects: Prospect[]; onClose: () => void; onSaved: () => void;
}) {
  const [v, setV] = useState<HqTaskInput>({
    title: task.title, due_date: task.due_date, urgent: task.urgent, prospect_id: task.prospect_id,
  });
  const set = (patch: Partial<HqTaskInput>) => setV((prev) => ({ ...prev, ...patch }));
  const [error, setError] = useState("");

  const saveMut = useMutation({
    mutationFn: () => saveTask(v, task.id),
    onSuccess: () => { toast.success("Tarea guardada"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos guardar. Vuelve a intentarlo.")),
  });
  const delMut = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => { toast.success("Tarea borrada"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos borrarla. Vuelve a intentarlo.")),
  });

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); setError(""); saveMut.mutate(); }}
        className="w-full max-w-md rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">Tarea</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="mt-4 space-y-3 text-sm font-semibold">
          <label className="block">Qué hay que hacer *
            <input className={inputCls} value={v.title} onChange={(e) => set({ title: e.target.value })} />
          </label>
          <div>Para cuándo
            <DateField value={v.due_date ?? ""} onChange={(d) => set({ due_date: d || null })} ariaLabel="Para cuándo" className={inputCls} />
            {v.due_date && (
              <button type="button" onClick={() => set({ due_date: null })} className="mt-1 text-xs font-semibold underline text-ink/60">
                Quitar fecha
              </button>
            )}
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={v.urgent} onChange={(e) => set({ urgent: e.target.checked })} className="h-4 w-4" />
            Urgente 🔥
          </label>
          <label className="block">Prospecto del CRM
            <select className={inputCls} value={v.prospect_id ?? ""} onChange={(e) => set({ prospect_id: e.target.value || null })}>
              <option value="">Ninguno</option>
              {prospects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.team ? ` · ${p.team}` : ""}</option>)}
            </select>
          </label>
        </div>

        {error && <p className="mt-3 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button type="submit" disabled={saveMut.isPending} className="btn-primary">
            {saveMut.isPending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button
            type="button" disabled={delMut.isPending}
            onClick={() => { if (confirm("¿Borrar esta tarea?")) delMut.mutate(); }}
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-pa-red"
          >
            <Trash2 size={14} /> Borrar
          </button>
        </div>
      </form>
    </div>
  );
}
