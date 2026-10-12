import { useQuery } from "@tanstack/react-query";
import { formatDayEs } from "@/components/ui/date-field";
import { isActive, listInjuries, zoneText, type Injury } from "@/lib/lesiones";

const hoyPA = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);

/** Jugadoras que hoy siguen lesionadas (para avisar al convocar). Si falla, no avisa y no estorba. */
export function useInjured(clubId: string | null | undefined): Map<string, Injury> {
  const q = useQuery({ queryKey: ["injuries", clubId], enabled: !!clubId, queryFn: () => listInjuries(clubId!) });
  const hoy = hoyPA();
  const m = new Map<string, Injury>();
  for (const i of q.data ?? []) if (isActive(i, hoy) && !m.has(i.player_id)) m.set(i.player_id, i);
  return m;
}

/** Aviso al convocar: se puede convocar igual, el entrenador decide. */
export function InjuredBadge({ injury }: { injury: Injury | undefined }) {
  if (!injury) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-pa-red/15 px-2 py-0.5 text-[11px] font-semibold text-pa-red"
      title={zoneText(injury.zone, injury.laterality)}>
      🩹 Lesionada{injury.expected_return ? ` hasta ${formatDayEs(injury.expected_return)}` : ""}
    </span>
  );
}
