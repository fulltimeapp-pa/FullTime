import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlayerShell } from "@/components/player/PlayerShell";
import { MiTemporada } from "@/components/match/MiTemporada";
import { addDaysISO, dayPA, loadEntries } from "@/lib/carga";
import { formatDayEs } from "@/components/ui/date-field";

export const Route = createFileRoute("/_authenticated/mis-estadisticas")({
  head: () => ({ meta: [{ title: "FullTime — Mis números" }] }),
  component: MisNumeros,
});

type Asistencia = { asistio: number; marcadas: number; pct: number | null };

function calc(rows: { attended: boolean | null }[]): Asistencia {
  const asistio = rows.filter((r) => r.attended === true).length;
  const marcadas = rows.filter((r) => r.attended != null).length;
  return { asistio, marcadas, pct: marcadas ? Math.round((asistio / marcadas) * 100) : null };
}

function MisNumeros() {
  const { user } = Route.useRouteContext();
  const meQ = useQuery({
    queryKey: ["me-player-full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("id, club_id, full_name").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const attQ = useQuery({
    queryKey: ["me-attendance-split", meQ.data?.id],
    enabled: !!meQ.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("call_up_players").select("attended, call_ups(kind, starts_at)").eq("player_id", meQ.data!.id);
      if (error) throw error;
      const past = (data ?? []).filter((r: any) => r.call_ups && new Date(r.call_ups.starts_at).getTime() < Date.now()) as any[];
      return {
        total: calc(past),
        entrenos: calc(past.filter((r) => r.call_ups.kind === "entreno")),
        partidos: calc(past.filter((r) => r.call_ups.kind === "partido")),
      };
    },
  });
  const me = meQ.data;
  const att = attQ.data;

  return (
    <PlayerShell>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <span className="chip"><span className="h-1.5 w-1.5 rounded-full bg-lime inline-block" /> Tu temporada</span>
        <h1 className="mt-4 text-display text-4xl md:text-5xl font-bold leading-[0.95]">
          Mis <span className="marker-underline">números</span>
        </h1>
        <p className="mt-3 text-sm text-ink/60">Solo tú y tu cuerpo técnico ven estos números.</p>

        {(meQ.isError || attQ.isError) && (
          <p className="mt-6 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
            No pudimos cargar tus números. Recarga la página.
          </p>
        )}
        {meQ.isLoading ? (
          <p className="mt-8 text-sm text-ink/50">Cargando…</p>
        ) : !me ? (
          <p className="mt-8 text-sm text-ink/60">Todavía no estás en un equipo.</p>
        ) : (
          <div className="mt-8 space-y-5">
            <section className="rounded-2xl border-2 border-ink bg-card p-6 md:p-7">
              <h2 className="font-display text-xl font-bold">Tu asistencia</h2>
              {!att || att.total.marcadas === 0 ? (
                <p className="mt-2 text-sm text-ink/60">Aún sin datos: aparece cuando tu Profe pase lista.</p>
              ) : (
                <>
                  <p className="mt-2 font-display text-4xl font-bold">{att.total.pct}%</p>
                  <p className="text-sm text-ink/60">Asististe a {att.total.asistio} de {att.total.marcadas}.</p>
                  <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
                    <div className={`h-full rounded-full ${att.total.pct != null && att.total.pct < 60 ? "bg-pa-red" : "bg-lime"}`} style={{ width: `${att.total.pct ?? 0}%` }} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-xl bg-paper p-3">
                      <p className="font-display text-2xl font-bold">{att.entrenos.pct ?? "—"}{att.entrenos.pct != null ? "%" : ""}</p>
                      <p className="text-xs font-semibold text-ink/60">Entrenos ({att.entrenos.asistio}/{att.entrenos.marcadas})</p>
                    </div>
                    <div className="rounded-xl bg-paper p-3">
                      <p className="font-display text-2xl font-bold">{att.partidos.pct ?? "—"}{att.partidos.pct != null ? "%" : ""}</p>
                      <p className="text-xs font-semibold text-ink/60">Partidos ({att.partidos.asistio}/{att.partidos.marcadas})</p>
                    </div>
                  </div>
                </>
              )}
            </section>

            <MiTemporada clubId={me.club_id} playerId={me.id} />
            <MiBienestar clubId={me.club_id} playerId={me.id} />
          </div>
        )}
      </main>
    </PlayerShell>
  );
}

/** Su wellness y RPE del último mes (la base solo le da lo suyo). */
function MiBienestar({ clubId, playerId }: { clubId: string; playerId: string }) {
  const q = useQuery({ queryKey: ["my-load", clubId], queryFn: () => loadEntries(clubId) });
  if (!q.isSuccess) return null;
  const desde = addDaysISO(dayPA(new Date().toISOString()), -30);
  const mine = q.data.filter((e) => e.playerId === playerId && e.day >= desde);
  const w = mine.filter((e) => e.kind === "wellness");
  const r = mine.filter((e) => e.kind === "rpe");
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  const ultimos = [...new Set(mine.map((e) => e.day))].sort().reverse().slice(0, 5);

  return (
    <section className="rounded-2xl border-2 border-ink bg-card p-6 md:p-7">
      <h2 className="font-display text-xl font-bold">Tu wellness y RPE</h2>
      <p className="mt-1 text-sm text-ink/60">Últimos 30 días.</p>
      {mine.length === 0 ? (
        <p className="mt-3 text-sm text-ink/60">Todavía no has respondido wellness ni RPE en este tiempo.</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-paper p-3">
              <p className="font-display text-2xl font-bold">{avg(w.map((e) => e.score)) ?? "—"}</p>
              <p className="text-xs font-semibold text-ink/60">Wellness promedio (de 5)</p>
            </div>
            <div className="rounded-xl bg-paper p-3">
              <p className="font-display text-2xl font-bold">{avg(r.map((e) => e.score)) ?? "—"}</p>
              <p className="text-xs font-semibold text-ink/60">RPE promedio (de 10)</p>
            </div>
          </div>
          <ul className="mt-4 divide-y divide-ink/10 text-sm">
            {ultimos.map((d) => {
              const we = w.find((e) => e.day === d);
              const re = r.find((e) => e.day === d);
              return (
                <li key={d} className="flex justify-between gap-3 py-2">
                  <span className="capitalize text-ink/70">{formatDayEs(d, true)}</span>
                  <span className="font-semibold">{we ? `Wellness ${we.score}` : ""}{we && re ? " · " : ""}{re ? `RPE ${re.score}` : ""}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
