import { useState } from "react";
import { HeartPulse, Flame } from "lucide-react";

export type WellnessValues = {
  wellness_sleep: number | null;
  wellness_energy: number | null;
  wellness_mood: number | null;
  wellness_soreness: number | null;
  wellness_at: string | null;
};

export type WellnessKey = "wellness_sleep" | "wellness_energy" | "wellness_mood" | "wellness_soreness";

export const WELLNESS_QUESTIONS: { key: WellnessKey; label: string; hint: string; short: string; emojis: string[] }[] = [
  { key: "wellness_sleep", label: "¿Cómo dormiste?", hint: "1 = muy mal · 5 = excelente", short: "Sueño", emojis: ["😴", "🥱", "😐", "🙂", "😃"] },
  { key: "wellness_energy", label: "¿Cómo está tu energía?", hint: "1 = en cero · 5 = a full", short: "Energía", emojis: ["🪫", "😮‍💨", "😐", "💪", "⚡"] },
  { key: "wellness_mood", label: "¿Cómo te sientes de ánimo?", hint: "1 = mal · 5 = excelente", short: "Ánimo", emojis: ["😞", "😕", "😐", "😊", "🤩"] },
  { key: "wellness_soreness", label: "¿Tienes molestias o dolor?", hint: "1 = nada · 5 = mucho", short: "Molestias", emojis: ["✅", "🙂", "😐", "😣", "🤕"] },
];

function Scale({
  value, max, onPick, labels, disabled,
}: { value: number | null; max: number; onPick: (n: number) => void; labels?: string[]; disabled?: boolean }) {
  return (
    <div className={`mt-2 grid gap-1.5 ${max === 5 ? "grid-cols-5" : "grid-cols-5 sm:grid-cols-10"}`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const on = value === n;
        return (
          <button
            key={n} type="button" disabled={disabled}
            onClick={() => onPick(n)}
            aria-label={`${n}`}
            className={`rounded-xl border-2 py-2.5 text-center font-display font-bold transition-all disabled:opacity-50 ${
              on ? "bg-lime border-ink text-ink shadow-[3px_3px_0_0_var(--color-ink)]" : "border-ink/30 bg-paper hover:bg-lime/20"
            }`}
          >
            {labels ? <span className="block text-lg leading-none">{labels[n - 1]}</span> : null}
            <span className={`block ${labels ? "mt-0.5 text-[11px] font-mono text-ink/60" : "text-base"}`}>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

export function WellnessForm({
  values, onSave, saving, closed,
}: {
  values: WellnessValues;
  onSave: (v: Record<WellnessKey, number>) => void;
  saving: boolean;
  closed: boolean;
}) {
  const [draft, setDraft] = useState<Partial<Record<WellnessKey, number>>>({
    wellness_sleep: values.wellness_sleep ?? undefined,
    wellness_energy: values.wellness_energy ?? undefined,
    wellness_mood: values.wellness_mood ?? undefined,
    wellness_soreness: values.wellness_soreness ?? undefined,
  });
  const complete = WELLNESS_QUESTIONS.every((q) => draft[q.key] != null);

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <HeartPulse size={18} /> ¿Cómo llegas hoy?
      </h2>
      <p className="mt-1 text-sm text-ink/50">
        {closed
          ? "El entreno ya empezó, tu wellness quedó guardado así."
          : values.wellness_at
            ? "Ya lo enviaste. Puedes cambiarlo hasta la hora del entreno."
            : "Cuatro preguntitas rápidas para que el Profe sepa cómo llegas."}
      </p>

      <div className="mt-4 space-y-4 rounded-2xl border-2 border-ink bg-card p-5">
        {WELLNESS_QUESTIONS.map((q) => (
          <div key={q.key}>
            <div className="font-semibold">{q.label}</div>
            <div className="text-xs font-mono uppercase tracking-wider text-ink/50">{q.hint}</div>
            <Scale
              value={draft[q.key] ?? null}
              max={5}
              labels={q.emojis}
              disabled={closed || saving}
              onPick={(n) => setDraft((d) => ({ ...d, [q.key]: n }))}
            />
          </div>
        ))}

        {!closed && (
          <button
            type="button"
            disabled={!complete || saving}
            onClick={() => onSave(draft as Record<WellnessKey, number>)}
            className="btn-primary !py-2.5 !px-5 !text-sm disabled:opacity-40"
          >
            {saving ? "Guardando..." : values.wellness_at ? "Actualizar wellness" : "Enviar wellness"}
          </button>
        )}
      </div>
    </section>
  );
}

export function RpeForm({
  value, savedAt, onSave, saving, available,
}: {
  value: number | null;
  savedAt: string | null;
  onSave: (n: number) => void;
  saving: boolean;
  available: boolean;
}) {
  const [draft, setDraft] = useState<number | null>(value);

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Flame size={18} /> ¿Qué tan exigente sentiste el entreno?
      </h2>
      <p className="mt-1 text-sm text-ink/50">
        {available
          ? savedAt
            ? "Ya respondiste. Puedes cambiarlo si quieres."
            : "1 = muy suave · 10 = al máximo."
          : "Vas a poder responder cuando arranque el entreno."}
      </p>
      <div className="mt-4 rounded-2xl border-2 border-ink bg-card p-5">
        <Scale value={draft} max={10} disabled={!available || saving} onPick={setDraft} />
        {available && (
          <button
            type="button"
            disabled={draft == null || saving}
            onClick={() => onSave(draft!)}
            className="mt-4 btn-primary !py-2.5 !px-5 !text-sm disabled:opacity-40"
          >
            {saving ? "Guardando..." : savedAt ? "Actualizar RPE" : "Enviar RPE"}
          </button>
        )}
      </div>
    </section>
  );
}

type SummaryRow = {
  id: string;
  name: string;
  wellness_sleep: number | null;
  wellness_energy: number | null;
  wellness_mood: number | null;
  wellness_soreness: number | null;
  wellness_at: string | null;
  rpe: number | null;
};

function avg(nums: (number | null)[]): string {
  const v = nums.filter((n): n is number => n != null);
  if (v.length === 0) return "—";
  return (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1);
}

export function WellnessSummary({ rows }: { rows: SummaryRow[] }) {
  const answered = rows.filter((r) => r.wellness_at);
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <HeartPulse size={20} /> Wellness del equipo
        </h2>
        <span className="text-sm font-mono text-ink/50">{answered.length} de {rows.length}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {WELLNESS_QUESTIONS.map((q) => (
          <div key={q.key} className="rounded-xl border-2 border-ink bg-lime/20 px-3 py-2.5 text-center">
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink/60">{q.short}</div>
            <div className="font-display text-2xl font-bold">{avg(answered.map((r) => r[q.key]))}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border-2 border-ink bg-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-3 text-sm text-ink/40">Nadie convocado todavía.</p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center gap-3">
                <span className="font-semibold flex-1 min-w-0 truncate">{r.name}</span>
                {r.wellness_at ? (
                  <div className="flex gap-1.5 shrink-0">
                    {WELLNESS_QUESTIONS.map((q) => (
                      <span
                        key={q.key}
                        title={q.short}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink font-display text-sm font-bold ${
                          q.key === "wellness_soreness"
                            ? (r[q.key] ?? 0) >= 4 ? "bg-pa-red text-paper" : "bg-paper"
                            : (r[q.key] ?? 5) <= 2 ? "bg-pa-red text-paper" : "bg-paper"
                        }`}
                      >
                        {r[q.key] ?? "—"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-ink/40 shrink-0">Sin responder</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-2 text-xs text-ink/50 font-mono uppercase tracking-wider">
        Orden: {WELLNESS_QUESTIONS.map((q) => q.short).join(" · ")}
      </p>
    </section>
  );
}

export function RpeSummary({ rows }: { rows: SummaryRow[] }) {
  const answered = rows.filter((r) => r.rpe != null);
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Flame size={20} /> RPE del equipo
        </h2>
        <span className="text-sm font-mono text-ink/50">
          Promedio {avg(answered.map((r) => r.rpe))} · {answered.length} de {rows.length}
        </span>
      </div>
      <div className="mt-4 rounded-2xl border-2 border-ink bg-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-3 text-sm text-ink/40">Nadie convocado todavía.</p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center gap-3">
                <span className="font-semibold flex-1 min-w-0 truncate">{r.name}</span>
                {r.rpe != null ? (
                  <span className={`inline-flex h-9 min-w-9 px-2 items-center justify-center rounded-lg border-2 border-ink font-display font-bold ${r.rpe >= 8 ? "bg-pa-red text-paper" : "bg-lime text-ink"}`}>
                    {r.rpe}
                  </span>
                ) : (
                  <span className="text-xs text-ink/40">Sin responder</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
