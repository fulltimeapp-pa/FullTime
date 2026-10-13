import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { getMatchSheet, summarizeMatch } from "@/lib/hoja-partido";
import { defaultFormation, getSharedLineup, resolveSpots } from "@/lib/alineacion";
import { Pitch } from "./Pitch";

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

  // Jugadora: solo si ya hay hoja.
  if (!report || !playerId) return null;
  const s = summarizeMatch(report.duration_min, sheet!.lineup, sheet!.events).players[playerId];
  return (
    <>
      {report.lineup_published && <SharedLineup callUpId={callUpId} playerId={playerId} formation={report.formation ?? defaultFormation(report.field_size)} />}
      {s && <MyNumbers s={s} />}
    </>
  );
}

/** La alineación que el entrenador decidió mostrar a las convocadas. */
function SharedLineup({ callUpId, playerId, formation }: { callUpId: string; playerId: string; formation: string }) {
  const q = useQuery({ queryKey: ["alineacion", callUpId], queryFn: () => getSharedLineup(callUpId) });
  if (q.isError) {
    return (
      <section className="mt-8 rounded-2xl border-2 border-ink bg-card p-5">
        <p className="font-display text-xl font-bold">Alineación</p>
        <p className="mt-2 text-sm font-medium text-pa-red">No pudimos cargar la alineación.</p>
        <button type="button" onClick={() => q.refetch()} className="mt-2 text-sm font-semibold underline">Volver a intentar</button>
      </section>
    );
  }
  const rows = q.data ?? [];
  const titulares = rows.filter((r) => r.role === "titular");
  if (titulares.length === 0) return null;
  const spots = resolveSpots(formation, titulares.map((t) => ({ id: t.player_id, x: t.pos_x, y: t.pos_y })));
  const suplentes = rows.filter((r) => r.role === "suplente");
  const yo = rows.find((r) => r.player_id === playerId);
  return (
    <section className="mt-8 rounded-2xl border-2 border-ink bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-xl font-bold">Alineación</p>
        <span className="font-mono text-sm font-bold text-ink/60">{formation}</span>
      </div>
      <p className="text-sm text-ink/60">
        {yo?.role === "titular" ? "Vas de titular. Estás marcada en la cancha." : yo?.role === "suplente" ? "Empiezas en el banco." : "Así sale el equipo."}
      </p>
      <div className="mt-4">
        <Pitch players={titulares.filter((t) => spots[t.player_id]).map((t) => ({
          id: t.player_id, name: t.short_name, jersey: t.jersey_number, ...spots[t.player_id], highlight: t.player_id === playerId,
        }))} />
      </div>
      {suplentes.length > 0 && (
        <p className="mt-3 text-sm">
          <span className="font-semibold">Suplentes: </span>
          {suplentes.map((x) => `${x.jersey_number != null ? `${x.jersey_number} ` : ""}${x.short_name}`).join(" · ")}
        </p>
      )}
    </section>
  );
}

function MyNumbers({ s }: { s: ReturnType<typeof summarizeMatch>["players"][string] }) {
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
