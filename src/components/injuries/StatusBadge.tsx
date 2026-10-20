import { useQuery } from "@tanstack/react-query";
import { isStatusActive, listStatuses, statusText, STATUS_ICON, type PlayerStatus } from "@/lib/estados";

const hoyPA = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);

/** Jugadoras que hoy están en duda o sancionadas (para avisar al convocar). Si falla, no avisa y no estorba. */
export function useStatuses(clubId: string | null | undefined): Map<string, PlayerStatus> {
  const q = useQuery({ queryKey: ["player-statuses", clubId], enabled: !!clubId, queryFn: () => listStatuses(clubId!) });
  const hoy = hoyPA();
  const m = new Map<string, PlayerStatus>();
  // Si tiene varios, manda la sanción (es la que de verdad impide jugar).
  for (const s of q.data ?? []) {
    if (!isStatusActive(s, hoy) || s.since > hoy) continue;
    const prev = m.get(s.player_id);
    if (!prev || (prev.status === "duda" && s.status === "sancionada")) m.set(s.player_id, s);
  }
  return m;
}

/** Aviso al convocar: se puede convocar igual, el entrenador decide. */
export function StatusBadge({ status }: { status: PlayerStatus | undefined }) {
  if (!status) return null;
  const red = status.status === "sancionada";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${red ? "bg-pa-red/15 text-pa-red" : "bg-ink/10 text-ink/80"}`}
      title={status.note ?? undefined}
    >
      {STATUS_ICON[status.status]} {statusText(status)}
    </span>
  );
}
