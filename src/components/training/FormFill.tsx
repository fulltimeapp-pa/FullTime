import { useState } from "react";
import { Flame, HeartPulse } from "lucide-react";
import { EMOJIS_5, EMOJIS_5_INV, type Answer, type FormKind, type FormResponse, type Question } from "@/lib/formularios";

type Value = Answer["value"];

/** Formulario de wellness o RPE que llena la jugadora (cualquier pregunta que haya armado el Profe). */
export function FormFill({ kind, questions, response, open, closedText, onSave, saving }: {
  kind: FormKind;
  questions: Question[];
  response: FormResponse | null;
  open: boolean;
  closedText: string;
  onSave: (values: Record<string, Value>) => void;
  saving: boolean;
}) {
  const [values, setValues] = useState<Record<string, Value>>(() =>
    Object.fromEntries((response?.answers ?? []).map((a) => [a.id, a.value])),
  );
  const set = (id: string, v: Value) => setValues((prev) => ({ ...prev, [id]: v }));
  const complete = questions.every((q) => !q.required || (values[q.id] != null && values[q.id] !== ""));
  const disabled = !open || saving;

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        {kind === "wellness" ? <><HeartPulse size={18} /> ¿Cómo llegas hoy?</> : <><Flame size={18} /> ¿Cómo te fue en el entreno?</>}
      </h2>
      <p className="mt-1 text-sm text-ink/50">
        {!open ? closedText : response ? "Ya lo enviaste. Puedes cambiarlo si quieres." : "Unas preguntitas rápidas para el Profe."}
      </p>

      <div className="mt-4 space-y-5 rounded-2xl border-2 border-ink bg-card p-5">
        {questions.map((q) => (
          <div key={q.id}>
            <div className="font-semibold">{q.label}{q.required ? "" : <span className="ml-1 text-xs font-normal text-ink/40">(opcional)</span>}</div>
            {q.hint && <div className="text-xs font-mono uppercase tracking-wider text-ink/50">{q.hint}</div>}
            <QuestionInput q={q} value={values[q.id] ?? null} onChange={(v) => set(q.id, v)} disabled={disabled} />
          </div>
        ))}

        {open && (
          <button
            type="button"
            disabled={!complete || saving}
            onClick={() => onSave(values)}
            className="btn-primary !py-2.5 !px-5 !text-sm disabled:opacity-40"
          >
            {saving ? "Guardando..." : response ? "Actualizar" : "Enviar"}
          </button>
        )}
      </div>
    </section>
  );
}

function QuestionInput({ q, value, onChange, disabled }: { q: Question; value: Value; onChange: (v: Value) => void; disabled: boolean }) {
  if (q.type === "escala5" || q.type === "escala10") {
    const max = q.type === "escala5" ? 5 : 10;
    const emojis = q.type === "escala5" ? (q.invert ? EMOJIS_5_INV : EMOJIS_5) : null;
    return (
      <div className={`mt-2 grid gap-1.5 ${max === 5 ? "grid-cols-5" : "grid-cols-5 sm:grid-cols-10"}`}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n} type="button" disabled={disabled} onClick={() => onChange(n)} aria-label={`${n}`}
            className={`rounded-xl border-2 py-2.5 text-center font-display font-bold transition-all disabled:opacity-50 ${
              value === n ? "bg-lime border-ink text-ink shadow-[3px_3px_0_0_var(--color-ink)]" : "border-ink/30 bg-paper hover:bg-lime/20"
            }`}
          >
            {emojis && <span className="block text-lg leading-none">{emojis[n - 1]}</span>}
            <span className={`block ${emojis ? "mt-0.5 text-[11px] font-mono text-ink/60" : "text-base"}`}>{n}</span>
          </button>
        ))}
      </div>
    );
  }
  if (q.type === "si_no") {
    return (
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[true, false].map((b) => (
          <button key={String(b)} type="button" disabled={disabled} onClick={() => onChange(b)}
            className={`rounded-xl border-2 py-2.5 font-semibold disabled:opacity-50 ${value === b ? "bg-lime border-ink" : "border-ink/30 bg-paper"}`}>
            {b ? "Sí" : "No"}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === "opciones") {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {(q.options ?? []).map((o) => (
          <button key={o} type="button" disabled={disabled} onClick={() => onChange(o)}
            className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold disabled:opacity-50 ${value === o ? "bg-lime border-ink" : "border-ink/30 bg-paper"}`}>
            {o}
          </button>
        ))}
      </div>
    );
  }
  return (
    <textarea
      value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      rows={2} maxLength={500}
      className="mt-2 w-full resize-none rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2 text-sm outline-none disabled:opacity-60"
    />
  );
}

/** Lo que ve el cuerpo técnico: quién respondió y qué. */
export function FormResults({ kind, questions, rows, responses }: {
  kind: FormKind;
  questions: Question[];
  rows: { playerId: string; name: string }[];
  responses: FormResponse[];
}) {
  const byPlayer = new Map(responses.filter((r) => r.kind === kind).map((r) => [r.player_id, r]));
  const answered = rows.filter((r) => byPlayer.has(r.playerId));
  const pending = rows.filter((r) => !byPlayer.has(r.playerId));
  const scores = answered.map((r) => byPlayer.get(r.playerId)!.score).filter((s): s is number => s != null);
  const avg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  const low = (s: number | null) => s != null && (kind === "wellness" ? s <= 2.5 : s >= 9);

  // Columnas: las preguntas del formulario actual (las respuestas viejas se leen por id).
  const cols = questions.filter((q) => q.type !== "texto" && (kind === "wellness" || q.type !== "escala10"));
  // Número de cada pregunta según el orden del formulario (el mismo que ve la jugadora).
  const num = (id: string) => questions.findIndex((q) => q.id === id) + 1;
  const texts = questions.filter((q) => q.type === "texto");

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        {kind === "wellness" ? <HeartPulse size={18} /> : <Flame size={18} />} {kind === "wellness" ? "Wellness del equipo" : "RPE del equipo"}
      </h2>
      <p className="mt-1 text-sm text-ink/60">
        Respondieron {answered.length} de {rows.length}
        {avg != null ? ` · promedio ${avg}${kind === "wellness" ? " de 5" : " de 10"}` : ""}
        {kind === "wellness" ? " · 5 = llega muy bien" : ""}
      </p>
      {answered.length > 0 && cols.length > 0 && (
        <ol className="mt-3 space-y-1 rounded-2xl border-2 border-ink/15 bg-paper p-3 text-sm">
          {cols.map((q) => (
            <li key={q.id} className="flex gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-lime">{num(q.id)}</span>
              <span>
                <span className="font-semibold">{q.label}</span>
                {q.hint && <span className="text-ink/50"> · {q.hint}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
      {answered.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-2xl border-2 border-ink bg-card">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-ink/50">
                <th className="px-3 py-2">Jugadora</th>
                <th className="px-2">{kind === "wellness" ? "Total" : "RPE"}</th>
                {cols.map((q) => (
                  <th key={q.id} className="px-2 text-center" title={q.label}>
                    <span className="inline-grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-lime">{num(q.id)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {answered.map((r) => {
                const resp = byPlayer.get(r.playerId)!;
                const val = (id: string) => resp.answers.find((a) => a.id === id)?.value;
                return (
                  <tr key={r.playerId} className={low(resp.score) ? "bg-pa-red/10" : ""}>
                    <td className="px-3 py-2 font-semibold">{r.name}</td>
                    <td className="px-2 font-mono font-bold">{resp.score ?? "—"}</td>
                    {cols.map((q) => {
                      const v = val(q.id);
                      return <td key={q.id} className="px-2 text-center">{v === true ? "Sí" : v === false ? "No" : v ?? "—"}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {texts.length > 0 && answered.some((r) => texts.some((q) => byPlayer.get(r.playerId)!.answers.find((a) => a.id === q.id && a.value))) && (
            <div className="border-t-2 border-ink/10 p-3 space-y-1.5 text-sm">
              {answered.flatMap((r) =>
                texts.map((q) => {
                  const v = byPlayer.get(r.playerId)!.answers.find((a) => a.id === q.id)?.value;
                  return v ? <p key={`${r.playerId}-${q.id}`}><b>{r.name}</b> <span className="text-ink/50">({q.label})</span>: {String(v)}</p> : null;
                }),
              )}
            </div>
          )}
        </div>
      )}
      {pending.length > 0 && (
        <p className="mt-2 text-xs text-ink/50">Falta: {pending.map((p) => p.name).join(", ")}</p>
      )}
      {kind === "wellness" && answered.some((r) => low(byPlayer.get(r.playerId)!.score)) && (
        <p className="mt-1 text-xs font-semibold text-pa-red">En rojo: llegan con wellness bajo (2.5 o menos). Vale la pena hablar con ellas.</p>
      )}
    </section>
  );
}
