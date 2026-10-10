import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ClipboardCheck, Copy, Plus, Star, Trash2, X } from "lucide-react";
import { StaffShell } from "@/components/staff/StaffShell";
import { getMyActiveClub } from "@/lib/active-club";
import { friendlyError } from "@/lib/errors";
import {
  DEFAULT_FORMS, KIND_LABEL, TYPE_LABEL, deleteForm, listForms, newQuestionId, saveForm,
  type ClubForm, type FormKind, type Question, type QuestionType,
} from "@/lib/formularios";
import { FormFill } from "@/components/training/FormFill";

export const Route = createFileRoute("/_authenticated/formularios")({
  head: () => ({ meta: [{ title: "FullTime — Wellness y RPE" }] }),
  component: () => (
    <StaffShell>
      <FormulariosPage />
    </StaffShell>
  ),
});

type Draft = { id?: string; kind: FormKind; name: string; questions: Question[]; is_default: boolean };

function FormulariosPage() {
  const qc = useQueryClient();
  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });
  const clubId = clubQ.data?.club_id;
  const formsQ = useQuery({ queryKey: ["club-forms", clubId], enabled: !!clubId, queryFn: () => listForms(clubId!) });
  const [kind, setKind] = useState<FormKind>("wellness");
  const [draft, setDraft] = useState<Draft | null>(null);

  const mine = (formsQ.data ?? []).filter((f) => f.kind === kind);
  const hasDefault = mine.some((f) => f.is_default);

  const startFromTemplate = () =>
    setDraft({ kind, name: DEFAULT_FORMS[kind].name, questions: DEFAULT_FORMS[kind].questions.map((q) => ({ ...q })), is_default: !hasDefault });
  const copyOf = (f: ClubForm) =>
    setDraft({ kind, name: `${f.name} (copia)`, questions: f.questions.map((q) => ({ ...q, id: newQuestionId() })), is_default: false });

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 md:py-14">
      <span className="chip"><ClipboardCheck size={12} className="inline-block -mt-0.5" /> Seguimiento</span>
      <h1 className="mt-4 text-display text-4xl md:text-5xl font-bold leading-[0.95]">
        Wellness y <span className="marker-underline">RPE</span>
      </h1>
      <p className="mt-3 text-muted-foreground">
        Arma las preguntas que les haces a tus jugadoras. El que tiene ⭐ es el que se usa por defecto en los entrenos.
      </p>

      <div className="mt-6 grid max-w-sm grid-cols-2 gap-2 rounded-2xl border-2 border-ink bg-card p-1">
        {(["wellness", "rpe"] as FormKind[]).map((k) => (
          <button key={k} onClick={() => setKind(k)}
            className={`rounded-xl py-2.5 text-sm font-semibold ${kind === k ? "bg-ink text-lime" : "text-ink/70 hover:bg-ink/5"}`}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>

      {formsQ.isError && (
        <p className="mt-6 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          No pudimos cargar tus formularios. Recarga la página.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {!hasDefault && (
          <div className="rounded-2xl border-2 border-dashed border-ink/30 bg-paper p-5">
            <p className="font-display text-lg font-bold">⭐ {DEFAULT_FORMS[kind].name} <span className="text-xs font-normal text-ink/50">(plantilla de FullTime)</span></p>
            <p className="mt-1 text-sm text-ink/60">{DEFAULT_FORMS[kind].questions.map((q) => q.label).join(" · ")}</p>
            <p className="mt-2 text-xs text-ink/50">Es la que se usa mientras no armes la tuya.</p>
            <button onClick={startFromTemplate} className="btn-primary mt-3 !py-2">Editar esta plantilla</button>
          </div>
        )}
        {mine.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-ink bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold">{f.is_default ? "⭐ " : ""}{f.name}</p>
              <p className="text-sm text-ink/60">{f.questions.length} {f.questions.length === 1 ? "pregunta" : "preguntas"}</p>
            </div>
            <button onClick={() => copyOf(f)} className="inline-flex items-center gap-1 text-sm font-semibold underline"><Copy size={13} /> Duplicar</button>
            <button onClick={() => setDraft({ id: f.id, kind, name: f.name, questions: f.questions.map((q) => ({ ...q })), is_default: f.is_default })}
              className="btn-ghost !py-2">Editar</button>
          </div>
        ))}
        <button onClick={() => setDraft({ kind, name: "", questions: [{ id: newQuestionId(), label: "", type: kind === "rpe" ? "escala10" : "escala5", required: true }], is_default: !hasDefault && mine.length === 0 })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold underline">
          <Plus size={15} /> Crear un formulario desde cero
        </button>
      </div>

      {draft && clubId && (
        <FormEditor
          draft={draft}
          clubId={clubId}
          onClose={() => setDraft(null)}
          onSaved={() => { setDraft(null); qc.invalidateQueries({ queryKey: ["club-forms"] }); }}
        />
      )}
    </main>
  );
}

const TYPES: QuestionType[] = ["escala5", "escala10", "si_no", "opciones", "texto"];

function FormEditor({ draft, clubId, onClose, onSaved }: { draft: Draft; clubId: string; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const setQ = (i: number, patch: Partial<Question>) =>
    setD((prev) => ({ ...prev, questions: prev.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) }));
  const move = (i: number, dir: -1 | 1) =>
    setD((prev) => {
      const qs = [...prev.questions];
      const j = i + dir;
      if (j < 0 || j >= qs.length) return prev;
      [qs[i], qs[j]] = [qs[j], qs[i]];
      return { ...prev, questions: qs };
    });

  const saveMut = useMutation({
    mutationFn: () => saveForm(clubId, d, d.id),
    onSuccess: () => { toast.success("Formulario guardado"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos guardar. Vuelve a intentarlo.")),
  });
  const delMut = useMutation({
    mutationFn: () => deleteForm(d.id!),
    onSuccess: () => { toast.success("Formulario borrado. Las respuestas que ya tenías se mantienen."); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos borrarlo. Vuelve a intentarlo.")),
  });

  const inputCls = "w-full rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2 outline-none";

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl font-bold">{d.id ? "Editar formulario" : "Nuevo formulario"} · {KIND_LABEL[d.kind]}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={() => setPreview(false)} className={`rounded-full border-2 px-3 py-1 text-sm font-semibold ${!preview ? "border-ink bg-lime" : "border-ink/20"}`}>Preguntas</button>
          <button onClick={() => setPreview(true)} className={`rounded-full border-2 px-3 py-1 text-sm font-semibold ${preview ? "border-ink bg-lime" : "border-ink/20"}`}>Así lo ve la jugadora</button>
        </div>

        {preview ? (
          <FormFill kind={d.kind} questions={d.questions.filter((q) => q.label.trim())} response={null} open
            closedText="" saving={false} onSave={() => toast("Esto es una vista previa: no se guarda nada.")} />
        ) : (
          <>
            <label className="mt-4 block text-sm font-semibold">Nombre del formulario
              <input className={`mt-1 ${inputCls}`} value={d.name} maxLength={80} onChange={(e) => setD({ ...d, name: e.target.value })}
                placeholder={d.kind === "wellness" ? "Wellness pretemporada" : "RPE del entreno"} />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={d.is_default} onChange={(e) => setD({ ...d, is_default: e.target.checked })} className="h-4 w-4" />
              <Star size={14} /> Usarlo por defecto en los entrenos
            </label>

            <div className="mt-4 space-y-3">
              {d.questions.map((q, i) => (
                <div key={q.id} className="rounded-xl border-2 border-ink/20 bg-card p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-2 w-5 font-mono text-xs text-ink/40">{i + 1}</span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <input className={`${inputCls} font-semibold`} value={q.label} maxLength={140} onChange={(e) => setQ(i, { label: e.target.value })}
                        placeholder="Escribe la pregunta" />
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <select value={q.type} onChange={(e) => setQ(i, { type: e.target.value as QuestionType, options: e.target.value === "opciones" ? (q.options?.length ? q.options : ["", ""]) : undefined })}
                          className="rounded-lg border-2 border-ink/20 bg-paper px-2 py-1.5" aria-label="Tipo de pregunta">
                          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                        </select>
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={q.required} onChange={(e) => setQ(i, { required: e.target.checked })} /> Obligatoria
                        </label>
                        {q.type === "escala5" && d.kind === "wellness" && (
                          <label className="flex items-center gap-1.5" title="Para preguntas como dolor o estrés, donde 5 es malo">
                            <input type="checkbox" checked={!!q.invert} onChange={(e) => setQ(i, { invert: e.target.checked })} /> 5 es malo
                          </label>
                        )}
                      </div>
                      {(q.type === "escala5" || q.type === "escala10") && (
                        <input className={`${inputCls} text-sm`} value={q.hint ?? ""} maxLength={80} onChange={(e) => setQ(i, { hint: e.target.value })}
                          placeholder={q.type === "escala5" ? "Ayuda: 1 = muy mal · 5 = excelente" : "Ayuda: 1 = muy suave · 10 = al máximo"} />
                      )}
                      {q.type === "opciones" && (
                        <div className="space-y-1.5">
                          {(q.options ?? []).map((o, k) => (
                            <div key={k} className="flex gap-2">
                              <input className={`${inputCls} text-sm`} value={o} maxLength={60}
                                onChange={(e) => setQ(i, { options: (q.options ?? []).map((x, m) => (m === k ? e.target.value : x)) })}
                                placeholder={`Opción ${k + 1}`} />
                              <button type="button" aria-label="Quitar opción" onClick={() => setQ(i, { options: (q.options ?? []).filter((_, m) => m !== k) })}
                                className="text-ink/50 hover:text-pa-red"><X size={15} /></button>
                            </div>
                          ))}
                          <button type="button" onClick={() => setQ(i, { options: [...(q.options ?? []), ""] })} className="text-xs font-semibold underline">+ Agregar opción</button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-7 w-7 place-items-center rounded-lg border-2 border-ink/20 disabled:opacity-25"><ArrowUp size={14} /></button>
                      <button type="button" aria-label="Bajar" disabled={i === d.questions.length - 1} onClick={() => move(i, 1)} className="grid h-7 w-7 place-items-center rounded-lg border-2 border-ink/20 disabled:opacity-25"><ArrowDown size={14} /></button>
                      <button type="button" aria-label="Borrar pregunta" disabled={d.questions.length === 1}
                        onClick={() => setD({ ...d, questions: d.questions.filter((_, j) => j !== i) })}
                        className="grid h-7 w-7 place-items-center rounded-lg border-2 border-ink/20 text-pa-red disabled:opacity-25"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {d.questions.length < 30 && (
                <button type="button"
                  onClick={() => setD({ ...d, questions: [...d.questions, { id: newQuestionId(), label: "", type: "escala5", required: true }] })}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-ink/30 px-3 py-2 text-sm font-semibold hover:border-ink">
                  <Plus size={15} /> Agregar pregunta
                </button>
              )}
            </div>
            {d.kind === "rpe" && !d.questions.some((q) => q.type === "escala10") && (
              <p className="mt-3 text-xs font-semibold text-pa-red">Sin una pregunta "Escala del 1 al 10" no se puede calcular la carga del entreno.</p>
            )}
          </>
        )}

        {error && <p className="mt-3 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">{error}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={() => { setError(""); saveMut.mutate(); }} disabled={saveMut.isPending} className="btn-primary">
            {saveMut.isPending ? "Guardando…" : "Guardar formulario"}
          </button>
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          {d.id && (
            <button type="button" disabled={delMut.isPending}
              onClick={() => { if (confirm("¿Borrar este formulario? Las respuestas que ya tienes se mantienen.")) delMut.mutate(); }}
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-pa-red">
              <Trash2 size={14} /> Borrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
