import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { getMatchSheet, summarizeMatch } from "@/lib/hoja-partido";

/** En el detalle de un partido: acceso a la hoja (cuerpo técnico) o los números propios (jugadora). */
export function MatchSheetCard({ callUpId, isStaff, playerId, started }: {
  callUpId: string; isStaff: boolean; playerId: string | null; started: boolean;
}) {
  const q = useQuery({ queryKey: ["hoja", callUpId], queryFn: () => getMatchSheet(callUpId) });
  const sheet = q.data;
  const report = sheet?.report ?? null;

  if (isStaff) {
    const s = report ? summarizeMatch(report.duration_min, sheet!.lineup, sheet!.events) : null;
    return (
      <section className="mt-8 rounded-2xl border-2 border-ink bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-xl font-bold">Hoja del partido</p>
            <p className="text-sm text-ink/60">
              {s
                ? `Resultado ${s.goalsFor} – ${s.goalsAgainst}${report?.opponent ? ` contra ${report.opponent}` : ""}`
                : started
                  ? "Anota titulares, goles, tarjetas y cambios. Los minutos salen solos."
                  : "Cuando empiece el partido, anota aquí lo que pase."}
            </p>
          </div>
          <Link to="/hoja/$id" params={{ id: callUpId }} className="btn-primary !py-2.5">
            <ClipboardList size={16} /> {report ? "Abrir hoja" : "Llenar hoja"}
          </Link>
        </div>
      </section>
    );
  }

  // Jugadora: solo si ya hay hoja y ella aparece.
  if (!report || !playerId) return null;
  const s = summarizeMatch(report.duration_min, sheet!.lineup, sheet!.events).players[playerId];
  if (!s) return null;
  return (
    <section className="mt-8 rounded-2xl border-2 border-ink bg-card p-5">
      <p className="font-display text-xl font-bold">Tus números en este partido</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Minutos" value={`${s.minutes}'`} />
        <Stat label="Goles" value={String(s.goals)} />
        <Stat label="Tarjetas" value={s.red ? "🟥" : s.yellow ? "🟨".repeat(s.yellow) : "0"} />
      </div>
      <p className="mt-2 text-xs text-ink/50">
        {s.role === "titular" ? "Fuiste titular." : s.role === "suplente" ? "Empezaste en el banco." : ""}
        {s.injured ? " Saliste lesionada: cuídate y avísale a tu entrenador cómo sigues." : ""}
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper p-3">
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-xs font-semibold text-ink/60">{label}</p>
    </div>
  );
}
