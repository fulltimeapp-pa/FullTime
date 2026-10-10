import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StaffShell } from "@/components/staff/StaffShell";
import { getMyActiveClub } from "@/lib/active-club";
import { friendlyError } from "@/lib/errors";
import { buildSeason, loadSeasonMatches, type PlayerSeason } from "@/lib/estadisticas";
import { summarizeMatch } from "@/lib/hoja-partido";
import { formatDayEs } from "@/components/ui/date-field";

export const Route = createFileRoute("/_authenticated/estadisticas")({
  head: () => ({ meta: [{ title: "FullTime — Estadísticas" }] }),
  component: () => (
    <StaffShell>
      <EstadisticasPage />
    </StaffShell>
  ),
});

type SortKey = "minutos" | "goles" | "jugados" | "nombre";

function EstadisticasPage() {
  const [catId, setCatId] = useState("");
  const [comp, setComp] = useState("");
  const [sort, setSort] = useState<SortKey>("minutos");

  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });
  const clubId = clubQ.data?.club_id;

  const catsQ = useQuery({
    queryKey: ["categories", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").eq("club_id", clubId!).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const playersQ = useQuery({
    queryKey: ["stats-players", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("id, full_name, jersey_number, category_id").eq("club_id", clubId!);
      if (error) throw error;
      return data ?? [];
    },
  });
  const matchesQ = useQuery({ queryKey: ["season-matches", clubId], enabled: !!clubId, queryFn: () => loadSeasonMatches(clubId!) });

  const all = matchesQ.data ?? [];
  const competiciones = useMemo(
    () => [...new Set(all.map((m) => m.report.competition?.trim()).filter((c): c is string => !!c))].sort(),
    [all],
  );
  const matches = all.filter((m) => (!catId || m.categoryId === catId) && (!comp || m.report.competition?.trim() === comp));
  const { team, players } = buildSeason(matches);

  const info = new Map((playersQ.data ?? []).map((p) => [p.id, p]));
  const rows = Object.values(players)
    .filter((p) => !catId || info.get(p.playerId)?.category_id === catId || p.convocada > 0)
    .map((p) => ({ ...p, name: info.get(p.playerId)?.full_name ?? "Jugadora", jersey: info.get(p.playerId)?.jersey_number ?? null }))
    .sort((a, b) => (sort === "nombre" ? a.name.localeCompare(b.name) : (b[sort] as number) - (a[sort] as number) || a.name.localeCompare(b.name)));
  const goleadoras = rows.filter((r) => r.goles > 0).sort((a, b) => b.goles - a.goles).slice(0, 5);
  const maxTramo = Math.max(1, ...team.golesPorTramo.map((t) => Math.max(t.favor, t.contra)));

  function descargar() {
    const head = ["Jugadora", "Dorsal", "Convocatorias", "Partidos jugados", "Titular", "Suplente que jugó", "Suplente sin jugar", "Minutos", "Goles", "Amarillas", "Rojas", "Lesiones"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = rows.map((r) => [r.name, r.jersey ?? "", r.convocada, r.jugados, r.titular, r.suplenteJugo, r.suplenteNoJugo, r.minutos, r.goles, r.amarillas, r.rojas, r.lesiones].map(esc).join(","));
    const blob = new Blob(["﻿" + [head.map(esc).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `estadisticas${comp ? `-${comp}` : ""}.csv`.replace(/\s+/g, "-");
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Descargado. Ábrelo en Excel o Google Sheets.");
  }

  const sel = "rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm font-semibold";

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <span className="chip"><Trophy size={12} className="inline-block -mt-0.5" /> Temporada</span>
      <h1 className="mt-4 text-display text-4xl md:text-5xl font-bold leading-[0.95]">
        Estadís<span className="marker-underline">ticas</span>
      </h1>
      <p className="mt-3 text-muted-foreground">Salen de las hojas de partido. Un partido sin hoja no cuenta.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <select value={catId} onChange={(e) => setCatId(e.target.value)} className={sel} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {(catsQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={comp} onChange={(e) => setComp(e.target.value)} className={sel} aria-label="Competición">
          <option value="">Todas las competiciones</option>
          {competiciones.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {(matchesQ.isError || playersQ.isError) && (
        <p className="mt-6 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          {friendlyError(matchesQ.error ?? playersQ.error, "No pudimos cargar las estadísticas. Recarga la página.")}
        </p>
      )}

      {matchesQ.isLoading ? (
        <p className="mt-8 text-sm text-ink/50">Cargando…</p>
      ) : matches.length === 0 ? (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-ink/20 bg-paper p-6 text-center text-sm text-ink/60">
          Todavía no hay partidos con hoja{comp || catId ? " con este filtro" : ""}. Después de cada partido, llena su hoja y aquí aparecen los números.
        </div>
      ) : (
        <>
          {/* Equipo */}
          <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Partidos" value={team.partidos} />
            <Tile label="Ganados · Empates · Perdidos" value={`${team.ganados} · ${team.empatados} · ${team.perdidos}`} />
            <Tile label="Goles a favor · en contra" value={`${team.golesFavor} · ${team.golesContra}`} />
            <Tile label="Amarillas · Rojas" value={`${team.amarillas} · ${team.rojas}`} />
          </section>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <section className="rounded-2xl border-2 border-ink bg-card p-5">
              <h2 className="font-display text-xl font-bold">Goleadoras</h2>
              {goleadoras.length === 0 ? (
                <p className="mt-2 text-sm text-ink/60">Todavía no hay goles anotados.</p>
              ) : (
                <ol className="mt-3 space-y-1.5">
                  {goleadoras.map((g, i) => (
                    <li key={g.playerId} className="flex items-center gap-3">
                      <span className="w-5 font-mono text-sm text-ink/50">{i + 1}</span>
                      <span className="flex-1 font-semibold">{g.name}</span>
                      <span className="font-display text-lg font-bold">{g.goles} ⚽</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section className="rounded-2xl border-2 border-ink bg-card p-5">
              <h2 className="font-display text-xl font-bold">¿Cuándo caen los goles?</h2>
              <p className="text-xs text-ink/50">Por tramo de minutos. Verde: a favor. Rojo: en contra.</p>
              <div className="mt-3 space-y-1.5">
                {team.golesPorTramo.map((t) => (
                  <div key={t.tramo} className="flex items-center gap-2 text-xs">
                    <span className="w-14 font-mono text-ink/60">{t.tramo}</span>
                    <div className="flex-1 space-y-0.5">
                      <div className="h-2.5 rounded-full bg-lime" style={{ width: `${(t.favor / maxTramo) * 100}%`, minWidth: t.favor ? 6 : 0 }} />
                      <div className="h-2.5 rounded-full bg-pa-red/70" style={{ width: `${(t.contra / maxTramo) * 100}%`, minWidth: t.contra ? 6 : 0 }} />
                    </div>
                    <span className="w-10 text-right font-mono">{t.favor}·{t.contra}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Jugadoras */}
          <section className="mt-6 rounded-2xl border-2 border-ink bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold">Por jugadora</h2>
              <div className="flex flex-wrap items-center gap-2">
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={sel} aria-label="Ordenar">
                  <option value="minutos">Ordenar por minutos</option>
                  <option value="goles">Ordenar por goles</option>
                  <option value="jugados">Ordenar por partidos jugados</option>
                  <option value="nombre">Ordenar por nombre</option>
                </select>
                <button onClick={descargar} className="btn-ghost !py-2"><Download size={15} /> Descargar</button>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-ink/50">
                    <th className="py-2">Jugadora</th>
                    <th title="Convocatorias">Conv.</th>
                    <th title="Partidos jugados">PJ</th>
                    <th title="Titular">Tit.</th>
                    <th title="Suplente que jugó / que no jugó">Sup.</th>
                    <th>Min</th><th>⚽</th><th>🟨</th><th>🟥</th><th>🩹</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {rows.map((r: PlayerSeason & { name: string; jersey: number | null }) => (
                    <tr key={r.playerId}>
                      <td className="py-2 font-semibold">{r.jersey != null && <span className="mr-1 font-mono text-xs text-ink/40">{r.jersey}</span>}{r.name}</td>
                      <td>{r.convocada}</td>
                      <td>{r.jugados}</td>
                      <td>{r.titular}</td>
                      <td>{r.suplenteJugo}/{r.suplenteNoJugo}</td>
                      <td className="font-mono font-bold">{r.minutos}'</td>
                      <td>{r.goles || ""}</td>
                      <td>{r.amarillas || ""}</td>
                      <td>{r.rojas || ""}</td>
                      <td>{r.lesiones || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-ink/50">Sup.: suplente que entró / suplente que no entró.</p>
          </section>

          {/* Partidos */}
          <section className="mt-6 rounded-2xl border-2 border-ink bg-card p-5">
            <h2 className="font-display text-xl font-bold">Partidos</h2>
            <ul className="mt-3 divide-y divide-ink/10">
              {matches.map((m) => {
                const s = summarizeMatch(m.report.duration_min, m.lineup, m.events);
                const res = s.goalsFor > s.goalsAgainst ? "G" : s.goalsFor < s.goalsAgainst ? "P" : "E";
                return (
                  <li key={m.callUpId}>
                    <Link to="/hoja/$id" params={{ id: m.callUpId }} className="flex items-center gap-3 py-2.5 hover:bg-ink/5">
                      <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${res === "G" ? "bg-lime" : res === "P" ? "bg-pa-red text-paper" : "bg-ink/10"}`}>{res}</span>
                      <span className="flex-1">
                        <span className="font-semibold">vs {m.report.opponent || "Rival"}</span>
                        <span className="block text-xs text-ink/50">{formatDayEs(new Date(new Date(m.startsAt).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10))}{m.report.competition ? ` · ${m.report.competition}` : ""}</span>
                      </span>
                      <span className="font-display text-lg font-bold">{s.goalsFor} – {s.goalsAgainst}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-card p-4">
      <div className="font-display text-3xl font-bold">{value}</div>
      <div className="text-xs font-semibold text-ink/60">{label}</div>
    </div>
  );
}
