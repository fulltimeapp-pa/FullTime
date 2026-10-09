import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { HqHeader } from "@/components/hq/HqShell";
import { DateField, formatDayEs } from "@/components/ui/date-field";
import { friendlyError } from "@/lib/errors";
import {
  STAGES, deleteMeeting, listMeetings, listProspects, saveMeeting, stageLabel, todayPA, updateProspectFollowUp,
  type Meeting, type MeetingInput, type Prospect, type ProspectStage,
} from "@/lib/hq";

export const Route = createFileRoute("/_authenticated/hq/reuniones")({
  // ?prospecto=<id> abre "Nueva reunión" ya ligada a ese prospecto (desde el CRM).
  validateSearch: (s: Record<string, unknown>): { prospecto?: string } => ({
    prospecto: typeof s.prospecto === "string" ? s.prospecto : undefined,
  }),
  component: HqReuniones,
});

function emptyMeeting(prospect?: Prospect): MeetingInput {
  return {
    title: prospect ? `Reunión con ${prospect.name}` : "",
    meeting_date: todayPA(),
    attendees: prospect?.name ?? "",
    prospect_id: prospect?.id ?? null,
    summary: "", liked: "", concerns: "", next_steps: "",
  };
}

function HqReuniones() {
  const qc = useQueryClient();
  const { prospecto } = Route.useSearch();
  const meetingsQ = useQuery({ queryKey: ["hq-meetings"], queryFn: () => listMeetings() });
  const prospectsQ = useQuery({ queryKey: ["hq-prospects"], queryFn: listProspects });
  const prospects = prospectsQ.data ?? [];
  const [editing, setEditing] = useState<{ id?: string; value: MeetingInput } | null>(null);

  // Llegó desde el CRM con un prospecto: abrir la nueva reunión una sola vez.
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    if (!prospecto || abierto || !prospectsQ.data) return;
    setAbierto(true);
    setEditing({ value: emptyMeeting(prospectsQ.data.find((p) => p.id === prospecto)) });
  }, [prospecto, abierto, prospectsQ.data]);

  const nombre = (id: string | null) => prospects.find((p) => p.id === id)?.name;
  const items = meetingsQ.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:py-10">
      <HqHeader
        title="Reuniones"
        subtitle="Lo que hablaste en cada reunión y qué sigue."
        action={
          <button onClick={() => setEditing({ value: emptyMeeting() })} className="btn-primary !py-2.5">
            <Plus size={16} /> Nueva reunión
          </button>
        }
      />

      {meetingsQ.isError && (
        <p className="mt-6 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          No pudimos cargar tus reuniones. Recarga la página.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {meetingsQ.isLoading ? (
          <p className="text-sm text-ink/50">Cargando…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink/20 bg-paper p-6 text-center text-sm text-ink/60">
            Todavía no anotas reuniones. Toca "Nueva reunión" después de tu próxima demo.
          </div>
        ) : (
          items.map((m) => (
            <button
              key={m.id}
              onClick={() => setEditing({ id: m.id, value: toInput(m) })}
              className="w-full text-left rounded-2xl border-2 border-ink bg-card p-4 hover:shadow-[4px_4px_0_0_var(--color-ink)] transition-shadow"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-ink/50">{formatDayEs(m.meeting_date)}</span>
                {m.prospect_id && nombre(m.prospect_id) && (
                  <span className="rounded-full bg-lime/40 px-2 py-0.5 text-xs font-semibold">{nombre(m.prospect_id)}</span>
                )}
              </div>
              <p className="mt-1 font-display text-lg font-bold">{m.title}</p>
              {m.next_steps && <p className="mt-1 text-sm text-ink/70"><b>Sigue:</b> {m.next_steps}</p>}
            </button>
          ))
        )}
      </div>

      {editing && (
        <MeetingModal
          id={editing.id}
          initial={editing.value}
          prospects={prospects}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["hq-meetings"] });
            qc.invalidateQueries({ queryKey: ["hq-prospects"] });
          }}
        />
      )}
    </div>
  );
}

function toInput(m: Meeting): MeetingInput {
  return {
    title: m.title, meeting_date: m.meeting_date, attendees: m.attendees ?? "", prospect_id: m.prospect_id,
    summary: m.summary ?? "", liked: m.liked ?? "", concerns: m.concerns ?? "", next_steps: m.next_steps ?? "",
  };
}

const inputCls = "mt-1 w-full rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2.5 outline-none font-normal";

function MeetingModal({ id, initial, prospects, onClose, onSaved }: {
  id?: string; initial: MeetingInput; prospects: Prospect[]; onClose: () => void; onSaved: () => void;
}) {
  const [v, setV] = useState<MeetingInput>(initial);
  const set = (patch: Partial<MeetingInput>) => setV((prev) => ({ ...prev, ...patch }));
  const [error, setError] = useState("");

  const prospect = prospects.find((p) => p.id === v.prospect_id);
  // Actualizar al prospecto en el CRM al guardar (encendido por defecto en reuniones nuevas).
  const [follow, setFollow] = useState(!id);
  const [stage, setStage] = useState<ProspectStage>(prospect?.stage ?? "demo_hecha");
  const [nextStep, setNextStep] = useState(prospect?.next_step ?? "");
  const [nextDate, setNextDate] = useState(prospect?.next_date ?? "");
  useEffect(() => {
    if (!prospect) return;
    setStage(prospect.stage === "demo_agendada" ? "demo_hecha" : prospect.stage);
    setNextStep(prospect.next_step ?? "");
    setNextDate(prospect.next_date ?? "");
  }, [prospect?.id]);

  const saveMut = useMutation({
    mutationFn: async () => {
      await saveMeeting(v, id);
      if (follow && prospect) {
        await updateProspectFollowUp(prospect.id, { stage, next_step: nextStep, next_date: nextDate || null });
      }
    },
    onSuccess: () => {
      toast.success(follow && prospect ? `Reunión guardada y ${prospect.name} actualizado en el CRM` : "Reunión guardada");
      onSaved();
    },
    onError: (e) => setError(friendlyError(e, "No pudimos guardar. Vuelve a intentarlo.")),
  });
  const delMut = useMutation({
    mutationFn: () => deleteMeeting(id!),
    onSuccess: () => { toast.success("Reunión borrada"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos borrarla. Vuelve a intentarlo.")),
  });

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); setError(""); saveMut.mutate(); }}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{id ? "Reunión" : "Nueva reunión"}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-semibold">
          <label className="sm:col-span-2">Título *
            <input className={inputCls} value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="Demo con Carlos" autoFocus={!id} />
          </label>
          <div>Fecha
            <DateField value={v.meeting_date} onChange={(d) => set({ meeting_date: d })} ariaLabel="Fecha de la reunión" className={inputCls} />
          </div>
          <label>Con quién
            <input className={inputCls} value={v.attendees ?? ""} onChange={(e) => set({ attendees: e.target.value })} placeholder="Carlos Rivera" />
          </label>
          <label className="sm:col-span-2">Prospecto del CRM
            <select className={inputCls} value={v.prospect_id ?? ""} onChange={(e) => set({ prospect_id: e.target.value || null })}>
              <option value="">Ninguno</option>
              {prospects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.team ? ` · ${p.team}` : ""}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">Qué pasó
            <textarea className={`${inputCls} resize-none`} rows={3} value={v.summary ?? ""} onChange={(e) => set({ summary: e.target.value })} placeholder="Le mostré la demo del partido y los entrenos del mes…" />
          </label>
          <label>Qué le gustó
            <textarea className={`${inputCls} resize-none`} rows={3} value={v.liked ?? ""} onChange={(e) => set({ liked: e.target.value })} placeholder="Ver quién abrió el aviso…" />
          </label>
          <label>Qué preguntó o le preocupó
            <textarea className={`${inputCls} resize-none`} rows={3} value={v.concerns ?? ""} onChange={(e) => set({ concerns: e.target.value })} placeholder="¿Cuánto cuesta? ¿Funciona en Android?" />
          </label>
          <label className="sm:col-span-2">Próximos pasos acordados
            <textarea className={`${inputCls} resize-none`} rows={2} value={v.next_steps ?? ""} onChange={(e) => set({ next_steps: e.target.value })} placeholder="Mandarle la guía y crear su club el lunes" />
          </label>
        </div>

        {prospect && (
          <div className="mt-4 rounded-xl border-2 border-ink bg-lime/20 p-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="h-4 w-4" />
              Actualizar a {prospect.name} en el CRM (hoy está en "{stageLabel(prospect.stage)}")
            </label>
            {follow && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm font-semibold">
                <label>Nueva etapa
                  <select className={inputCls} value={stage} onChange={(e) => setStage(e.target.value as ProspectStage)}>
                    {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
                <label>Próximo paso
                  <input className={inputCls} value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Mandarle la guía" />
                </label>
                <div>Para cuándo
                  <DateField value={nextDate} onChange={setNextDate} ariaLabel="Para cuándo" className={inputCls} />
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-3 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button type="submit" disabled={saveMut.isPending} className="btn-primary">
            {saveMut.isPending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          {id && (
            <button
              type="button" disabled={delMut.isPending}
              onClick={() => { if (confirm("¿Borrar esta reunión?")) delMut.mutate(); }}
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
