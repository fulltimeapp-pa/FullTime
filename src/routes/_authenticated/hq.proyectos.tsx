import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Plus, Target, Trash2, X } from "lucide-react";
import { HqHeader } from "@/components/hq/HqShell";
import { DateField, formatDayEs } from "@/components/ui/date-field";
import { friendlyError } from "@/lib/errors";
import {
  PROJECT_STATUS, daysFromToday, deleteProject, listProjects, listTasks, saveProject, saveTask, setTaskDone,
  type HqProject, type HqProjectInput, type HqTask, type ProjectStatus,
} from "@/lib/hq";

export const Route = createFileRoute("/_authenticated/hq/proyectos")({
  component: HqProyectos,
});

const EMPTY: HqProjectInput = { name: "", goal: "", due_date: null, status: "activo" };

const STATUS_CHIP: Record<ProjectStatus, string> = {
  activo: "bg-lime/60",
  pausa: "bg-ink/10",
  terminado: "bg-ink text-lime",
};

function avance(tasks: HqTask[]) {
  const hechas = tasks.filter((t) => t.done_at).length;
  return { hechas, total: tasks.length, pct: tasks.length ? Math.round((hechas / tasks.length) * 100) : 0 };
}

function HqProyectos() {
  const qc = useQueryClient();
  const projectsQ = useQuery({ queryKey: ["hq-projects"], queryFn: listProjects });
  const tasksQ = useQuery({ queryKey: ["hq-tasks"], queryFn: listTasks });
  const [abierto, setAbierto] = useState<{ id?: string; value: HqProjectInput } | null>(null);
  const [verTerminados, setVerTerminados] = useState(false);

  const projects = projectsQ.data ?? [];
  const tareasDe = (id: string) => (tasksQ.data ?? []).filter((t) => t.project_id === id);
  const visibles = projects.filter((p) => p.status !== "terminado");
  const terminados = projects.filter((p) => p.status === "terminado");

  const card = (p: HqProject) => {
    const ts = tareasDe(p.id);
    const a = avance(ts);
    const proximas = ts.filter((t) => !t.done_at).sort((x, y) => (x.due_date ?? "9999") < (y.due_date ?? "9999") ? -1 : 1).slice(0, 3);
    const late = p.due_date && p.status !== "terminado" && daysFromToday(p.due_date) < 0;
    return (
      <button
        key={p.id}
        onClick={() => setAbierto({ id: p.id, value: { name: p.name, goal: p.goal ?? "", due_date: p.due_date, status: p.status } })}
        className="flex flex-col rounded-2xl border-2 border-ink bg-card p-5 text-left transition-shadow hover:shadow-[4px_4px_0_0_var(--color-ink)]"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-xl font-bold leading-tight">{p.name}</p>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CHIP[p.status]}`}>
            {PROJECT_STATUS.find((s) => s.value === p.status)?.label}
          </span>
        </div>
        {p.goal && <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/70"><Target size={14} /> {p.goal}</p>}
        {p.due_date && (
          <p className={`mt-1 text-xs font-semibold ${late ? "text-pa-red" : "text-ink/50"}`}>
            Para el {formatDayEs(p.due_date)}{late ? " · atrasado" : ""}
          </p>
        )}

        <div className="mt-4">
          <div className="flex justify-between text-xs font-semibold text-ink/60">
            <span>{a.total === 0 ? "Sin tareas todavía" : `${a.hechas} de ${a.total} tareas hechas`}</span>
            <span>{a.pct}%</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-paper">
            <div className="h-full bg-lime transition-all" style={{ width: `${a.pct}%` }} />
          </div>
        </div>

        {proximas.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {proximas.map((t) => (
              <li key={t.id} className="truncate text-ink/75">
                • {t.title}{t.due_date ? <span className="text-ink/45"> · {formatDayEs(t.due_date)}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:py-10">
      <HqHeader
        title="Proyectos"
        subtitle="Tus objetivos grandes, con sus tareas y cuánto llevas."
        action={
          <button onClick={() => setAbierto({ value: { ...EMPTY } })} className="btn-primary !py-2.5">
            <Plus size={16} /> Nuevo proyecto
          </button>
        }
      />

      {(projectsQ.isError || tasksQ.isError) && (
        <p className="mt-6 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          No pudimos cargar tus proyectos. Recarga la página.
        </p>
      )}

      {projectsQ.isLoading ? (
        <p className="mt-6 text-sm text-ink/50">Cargando…</p>
      ) : visibles.length === 0 ? (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-ink/20 bg-paper p-6 text-center text-sm text-ink/60">
          No tienes proyectos activos. Crea uno, por ejemplo "Primeros 5 clubes".
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">{visibles.map(card)}</div>
      )}

      {terminados.length > 0 && (
        <section className="mt-8">
          <button onClick={() => setVerTerminados((v) => !v)} className="text-sm font-semibold underline">
            {verTerminados ? "Ocultar terminados" : `Ver terminados (${terminados.length})`}
          </button>
          {verTerminados && <div className="mt-3 grid gap-4 md:grid-cols-2">{terminados.map(card)}</div>}
        </section>
      )}

      {abierto && (
        <ProjectModal
          id={abierto.id}
          initial={abierto.value}
          tasks={abierto.id ? tareasDe(abierto.id) : []}
          onClose={() => setAbierto(null)}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ["hq-projects"] });
            qc.invalidateQueries({ queryKey: ["hq-tasks"] });
          }}
        />
      )}
    </div>
  );
}

const inputCls = "mt-1 w-full rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2.5 outline-none font-normal";

function ProjectModal({ id, initial, tasks, onClose, onChanged }: {
  id?: string; initial: HqProjectInput; tasks: HqTask[]; onClose: () => void; onChanged: () => void;
}) {
  const [v, setV] = useState<HqProjectInput>(initial);
  const set = (patch: Partial<HqProjectInput>) => setV((prev) => ({ ...prev, ...patch }));
  const [error, setError] = useState("");
  const [nueva, setNueva] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");

  const saveMut = useMutation({
    mutationFn: () => saveProject(v, id),
    onSuccess: () => { toast.success(id ? "Proyecto guardado" : "Proyecto creado"); onChanged(); onClose(); },
    onError: (e) => setError(friendlyError(e, "No pudimos guardar. Vuelve a intentarlo.")),
  });
  const delMut = useMutation({
    mutationFn: () => deleteProject(id!),
    onSuccess: () => { toast.success("Proyecto borrado. Sus tareas siguen en Tareas."); onChanged(); onClose(); },
    onError: (e) => setError(friendlyError(e, "No pudimos borrarlo. Vuelve a intentarlo.")),
  });
  const addMut = useMutation({
    mutationFn: () => saveTask({ title: nueva, due_date: nuevaFecha || null, urgent: false, prospect_id: null, project_id: id! }),
    onSuccess: () => { setNueva(""); setNuevaFecha(""); onChanged(); },
    onError: (e) => setError(friendlyError(e, "No pudimos agregar la tarea. Vuelve a intentarlo.")),
  });
  const doneMut = useMutation({
    mutationFn: ({ tid, done }: { tid: string; done: boolean }) => setTaskDone(tid, done),
    onSuccess: onChanged,
    onError: (e) => setError(friendlyError(e, "No pudimos marcarla. Vuelve a intentarlo.")),
  });

  const pendientes = tasks.filter((t) => !t.done_at);
  const hechas = tasks.filter((t) => t.done_at);
  const a = avance(tasks);

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{id ? "Proyecto" : "Nuevo proyecto"}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setError(""); saveMut.mutate(); }}>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-semibold">
            <label className="sm:col-span-2">Nombre *
              <input className={inputCls} value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="Primeros 5 clubes" autoFocus={!id} />
            </label>
            <label className="sm:col-span-2">Meta
              <input className={inputCls} value={v.goal ?? ""} onChange={(e) => set({ goal: e.target.value })} placeholder="5 clubes pagando antes de diciembre" />
            </label>
            <div>Fecha límite
              <DateField value={v.due_date ?? ""} onChange={(d) => set({ due_date: d || null })} ariaLabel="Fecha límite" className={inputCls} />
            </div>
            <label>Estado
              <select className={inputCls} value={v.status} onChange={(e) => set({ status: e.target.value as ProjectStatus })}>
                {PROJECT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="submit" disabled={saveMut.isPending} className="btn-primary">
              {saveMut.isPending ? "Guardando…" : id ? "Guardar cambios" : "Crear proyecto"}
            </button>
            {id && (
              <button
                type="button" disabled={delMut.isPending}
                onClick={() => { if (confirm("¿Borrar este proyecto? Sus tareas no se borran.")) delMut.mutate(); }}
                className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-pa-red"
              >
                <Trash2 size={14} /> Borrar
              </button>
            )}
          </div>
        </form>

        {id && (
          <section className="mt-6 border-t-2 border-ink/10 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-bold">Tareas</h4>
              <span className="text-xs font-semibold text-ink/60">{a.hechas} de {a.total} · {a.pct}%</span>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (nueva.trim()) addMut.mutate(); }} className="mt-3 flex flex-wrap gap-2">
              <input
                value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Agregar tarea al proyecto"
                className="min-w-0 flex-1 rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2.5 outline-none"
              />
              <div className="w-40">
                <DateField value={nuevaFecha} onChange={setNuevaFecha} ariaLabel="Para cuándo" className="w-full rounded-xl border-2 border-ink/20 bg-paper px-3 py-2.5 text-sm" />
              </div>
              <button type="submit" disabled={addMut.isPending || !nueva.trim()} className="btn-primary !py-2.5" aria-label="Agregar tarea">
                <Plus size={18} />
              </button>
            </form>

            {tasks.length === 0 ? (
              <p className="mt-3 text-sm text-ink/50">Todavía no tiene tareas.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {[...pendientes, ...hechas].map((t) => {
                  const done = !!t.done_at;
                  return (
                    <li key={t.id} className="flex items-center gap-3 rounded-xl border-2 border-ink/15 bg-card px-3 py-2">
                      <button
                        type="button"
                        onClick={() => doneMut.mutate({ tid: t.id, done: !done })}
                        aria-label={done ? "Marcar como pendiente" : "Marcar como hecha"}
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-ink ${done ? "bg-lime" : "bg-paper hover:bg-lime/40"}`}
                      >
                        {done && <Check size={14} strokeWidth={3} />}
                      </button>
                      <span className={`min-w-0 flex-1 text-sm font-semibold ${done ? "line-through text-ink/45" : ""}`}>{t.title}</span>
                      {t.due_date && <span className="text-xs text-ink/50">{formatDayEs(t.due_date)}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink/50">
              Para cambiar fecha, urgencia o prospecto de una tarea, ábrela en <Link to="/hq/tareas" className="underline">Tareas</Link>.
            </p>
          </section>
        )}

        {error && <p className="mt-3 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">{error}</p>}
      </div>
    </div>
  );
}
