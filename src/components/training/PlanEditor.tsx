import { useState } from "react";
import { ChevronDown, GripVertical, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import {
  PLAN_PARTS,
  intensityLabel,
  newLocalId,
  totalMinutes,
  type Intensity,
  type PlanActivity,
  type PlanPart,
} from "@/lib/training-plan";

type Props = {
  activities: PlanActivity[];
  onChange: (next: PlanActivity[]) => void;
};

export function PlanEditor({ activities, onChange }: Props) {
  const total = totalMinutes(activities);

  function addActivity(part: PlanPart) {
    onChange([
      ...activities,
      { id: newLocalId(), part, name: "", duration_min: null, intensity: null, note: null },
    ]);
  }

  function updateActivity(id: string, patch: Partial<PlanActivity>) {
    onChange(activities.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function removeActivity(id: string) {
    onChange(activities.filter((a) => a.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    const part = activities.find((a) => a.id === id)?.part;
    if (!part) return;
    const inPart = activities.filter((a) => a.part === part);
    const idx = inPart.findIndex((a) => a.id === id);
    const swap = inPart[idx + dir];
    if (!swap) return;
    const next = activities.map((a) => {
      if (a.id === id) return swap;
      if (a.id === swap.id) return inPart[idx];
      return a;
    });
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg font-bold">Plan del entreno</h3>
        <span className="text-xs font-mono uppercase tracking-wider text-ink/50">
          {total > 0 ? `${total} min total` : "opcional"}
        </span>
      </div>

      {PLAN_PARTS.map((p) => {
        const items = activities.filter((a) => a.part === p.key);
        return (
          <PartBlock
            key={p.key}
            title={p.label}
            partKey={p.key}
            items={items}
            onAdd={() => addActivity(p.key)}
            onUpdate={updateActivity}
            onRemove={removeActivity}
            onMove={move}
          />
        );
      })}
    </div>
  );
}

function PartBlock({
  title,
  partKey,
  items,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
}: {
  title: string;
  partKey: PlanPart;
  items: PlanActivity[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<PlanActivity>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(true);
  const subtotal = totalMinutes(items);

  return (
    <div className="rounded-2xl border-2 border-ink bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-paper hover:bg-cream"
      >
        <GripVertical size={16} className="text-ink/30" />
        <span className="font-display font-bold uppercase tracking-wide text-sm flex-1 text-left">
          {title}
        </span>
        <span className="font-mono text-xs text-ink/50">
          {items.length} · {subtotal} min
        </span>
        <ChevronDown
          size={18}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="p-3 space-y-3 border-t-2 border-ink/10">
          {items.length === 0 && (
            <p className="text-sm text-ink/40 px-1">
              Aún no hay actividades en esta parte.
            </p>
          )}
          {items.map((a, i) => (
            <ActivityRow
              key={a.id}
              activity={a}
              canUp={i > 0}
              canDown={i < items.length - 1}
              onUpdate={(patch) => onUpdate(a.id, patch)}
              onRemove={() => onRemove(a.id)}
              onUp={() => onMove(a.id, -1)}
              onDown={() => onMove(a.id, 1)}
            />
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/30 bg-paper px-4 py-3 text-sm font-semibold hover:border-ink hover:bg-lime/20"
          >
            <Plus size={16} /> Agregar actividad
          </button>
        </div>
      )}
    </div>
  );
}

function ActivityRow({
  activity,
  canUp,
  canDown,
  onUpdate,
  onRemove,
  onUp,
  onDown,
}: {
  activity: PlanActivity;
  canUp: boolean;
  canDown: boolean;
  onUpdate: (patch: Partial<PlanActivity>) => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  const intensities: Intensity[] = ["suave", "media", "alta"];
  return (
    <div className="rounded-xl border-2 border-ink/15 bg-paper p-3 space-y-2">
      <div className="flex items-start gap-2">
        <input
          type="text"
          value={activity.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Nombre de la actividad"
          className="flex-1 rounded-lg border-2 border-ink/20 bg-paper px-3 py-2 font-semibold focus:border-ink outline-none"
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onUp}
            disabled={!canUp}
            className="p-1 rounded border border-ink/20 disabled:opacity-30 hover:bg-cream"
            aria-label="Subir"
          >
            <ArrowUp size={12} />
          </button>
          <button
            type="button"
            onClick={onDown}
            disabled={!canDown}
            className="p-1 rounded border border-ink/20 disabled:opacity-30 hover:bg-cream"
            aria-label="Bajar"
          >
            <ArrowDown size={12} />
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-2 rounded border border-ink/20 text-pa-red hover:bg-pa-red/10"
          aria-label="Eliminar"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-ink/50">Duración (min)</label>
          <input
            type="number"
            min={0}
            value={activity.duration_min ?? ""}
            onChange={(e) =>
              onUpdate({ duration_min: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })
            }
            className="mt-1 w-full rounded-lg border-2 border-ink/20 bg-paper px-3 py-2 focus:border-ink outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-ink/50">Intensidad</label>
          <div className="mt-1 flex gap-1">
            {intensities.map((i) => {
              const on = activity.intensity === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onUpdate({ intensity: on ? null : i })}
                  className={`flex-1 rounded-lg border-2 px-2 py-2 text-xs font-semibold ${
                    on ? "bg-ink text-lime border-ink" : "border-ink/20 bg-paper hover:bg-cream"
                  }`}
                >
                  {intensityLabel(i)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <textarea
        value={activity.note ?? ""}
        onChange={(e) => onUpdate({ note: e.target.value || null })}
        rows={1}
        placeholder="Nota (opcional): materiales, series, distancia..."
        className="w-full rounded-lg border-2 border-ink/20 bg-paper px-3 py-2 text-sm resize-none focus:border-ink outline-none"
      />
    </div>
  );
}
