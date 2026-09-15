export type CallUpKind = "partido" | "entreno";
export type ResponseStatus = "pending" | "going" | "declined";

export type CallUp = {
  id: string;
  club_id: string;
  category_id: string;
  kind: CallUpKind;
  starts_at: string;
  place: string;
  note: string | null;
  objetivo: string | null;
  created_by: string;
  created_at: string;
};

export type CallUpPlayerRow = {
  id: string;
  call_up_id: string;
  player_id: string;
  status: ResponseStatus;
  reason: string | null;
  read_at: string | null;
  responded_at: string | null;
  attended: boolean | null;
  attended_at: string | null;
};

export function kindLabel(k: CallUpKind): string {
  return k === "partido" ? "Partido" : "Entreno";
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = d.toLocaleTimeString("es-PA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} · ${time}`;
}

export function formatShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-PA", {
    day: "numeric",
    month: "short",
  }) + " · " + d.toLocaleTimeString("es-PA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
