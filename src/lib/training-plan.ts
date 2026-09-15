export type PlanPart = "calentamiento" | "principal" | "vuelta";
export type Intensity = "suave" | "media" | "alta";

export type PlanActivity = {
  id: string; // local UUID for React key; not persisted
  part: PlanPart;
  name: string;
  duration_min: number | null;
  intensity: Intensity | null;
  note: string | null;
};

export const PLAN_PARTS: { key: PlanPart; label: string }[] = [
  { key: "calentamiento", label: "Calentamiento" },
  { key: "principal", label: "Parte principal" },
  { key: "vuelta", label: "Parte final" },
];

export function partLabel(p: PlanPart): string {
  return PLAN_PARTS.find((x) => x.key === p)?.label ?? p;
}

export function intensityLabel(i: Intensity): string {
  return i === "suave" ? "Suave" : i === "media" ? "Media" : "Alta";
}

export function intensityTone(i: Intensity): string {
  return i === "suave"
    ? "bg-pa-blue/15 text-pa-blue border-pa-blue/30"
    : i === "media"
    ? "bg-lime/40 text-ink border-ink/30"
    : "bg-pa-red/15 text-pa-red border-pa-red/30";
}

export function totalMinutes(acts: Pick<PlanActivity, "duration_min">[]): number {
  return acts.reduce((sum, a) => sum + (a.duration_min ?? 0), 0);
}

export function newLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `tmp-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
