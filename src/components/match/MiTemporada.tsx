import { useQuery } from "@tanstack/react-query";
import { buildSeason, loadSeasonMatches } from "@/lib/estadisticas";

/** En el perfil de la jugadora: sus números de la temporada (solo los suyos). */
export function MiTemporada({ clubId, playerId }: { clubId: string; playerId: string }) {
  const q = useQuery({ queryKey: ["my-season", clubId], queryFn: () => loadSeasonMatches(clubId) });
  if (!q.isSuccess || q.data.length === 0) return null;
  const me = buildSeason(q.data).players[playerId];
  if (!me) return null;

  return (
    <section className="rounded-2xl border-2 border-ink bg-card p-6 md:p-7">
      <h2 className="font-display text-xl font-bold">Tu temporada</h2>
      <p className="mt-1 text-sm text-ink/60">De los partidos donde tu entrenador llenó la hoja.</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Minutos" value={`${me.minutos}'`} />
        <Stat label="Partidos" value={String(me.jugados)} />
        <Stat label="Goles" value={String(me.goles)} />
      </div>
      <p className="mt-3 text-sm text-ink/70">
        Titular en {me.titular} {me.titular === 1 ? "partido" : "partidos"} · convocada a {me.convocada}
        {me.amarillas || me.rojas ? ` · ${me.amarillas} 🟨 ${me.rojas} 🟥` : ""}
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
