import { Clock } from "lucide-react";
import {
  PLAN_PARTS,
  intensityLabel,
  intensityTone,
  totalMinutes,
  type PlanActivity,
} from "@/lib/training-plan";

export function PlanView({ activities }: { activities: PlanActivity[] }) {
  if (activities.length === 0) return null;
  const total = totalMinutes(activities);

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold">Plan del entreno</h2>
        {total > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm font-mono text-ink/60">
            <Clock size={14} /> {total} min total
          </span>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {PLAN_PARTS.map((p) => {
          const items = activities.filter((a) => a.part === p.key);
          if (items.length === 0) return null;
          const sub = totalMinutes(items);
          return (
            <div key={p.key} className="rounded-2xl border-2 border-ink bg-card overflow-hidden">
              <div className="px-4 py-2.5 flex items-center gap-2 bg-lime text-ink">
                <span className="font-display font-bold uppercase tracking-wide text-sm">
                  {p.label}
                </span>
                <span className="ml-auto font-mono text-xs opacity-80">
                  {items.length} · {sub} min
                </span>
              </div>
              <ul className="divide-y divide-ink/10">
                {items.map((a) => (
                  <li key={a.id} className="px-4 py-3">
                    <div className="flex items-start gap-3 flex-wrap">
                      <p className="font-semibold flex-1 min-w-0">{a.name}</p>
                      {a.duration_min != null && (
                        <span className="font-mono text-xs text-ink/60">{a.duration_min} min</span>
                      )}
                      {a.intensity && (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${intensityTone(a.intensity)}`}>
                          {intensityLabel(a.intensity)}
                        </span>
                      )}
                    </div>
                    {a.note && <p className="mt-1 text-sm text-ink/60">{a.note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
