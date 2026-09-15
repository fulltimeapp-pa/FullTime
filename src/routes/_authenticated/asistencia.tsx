import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StaffShell } from "@/components/staff/StaffShell";
import { getMyActiveClub } from "@/lib/active-club";

export const Route = createFileRoute("/_authenticated/asistencia")({
  head: () => ({
    meta: [
      { title: "FullTime — Asistencia" },
      { name: "description", content: "Estadísticas de asistencia de tu equipo por temporada." },
      { property: "og:title", content: "FullTime — Asistencia" },
      { property: "og:description", content: "Estadísticas de asistencia de tu equipo por temporada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <StaffShell>
      <AsistenciaPage />
    </StaffShell>
  ),
});

type Row = {
  player_id: string;
  full_name: string;
  category_name: string | null;
  convocada: number;
  asistio: number;
  falto: number;
  sin_marcar: number;
  pct: number | null;
};

type Stats = {
  resumen: { eventos_pasados: number; equipo_pct: number | null };
  jugadoras: Row[];
};

type RangeKey = "todo" | "30" | "mes";

function sinceFor(range: RangeKey): string | null {
  const now = new Date();
  if (range === "30") {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }
  if (range === "mes") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  }
  return null;
}

function AsistenciaPage() {
  const [catId, setCatId] = useState<string>("");
  const [range, setRange] = useState<RangeKey>("todo");

  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });
  const clubId = clubQ.data?.club_id;

  const catsQ = useQuery({
    queryKey: ["categories", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("club_id", clubId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const statsQ = useQuery({
    queryKey: ["attendance-stats", clubId, catId, range],
    enabled: !!clubId,
    queryFn: async (): Promise<Stats> => {
      const { data, error } = await supabase.rpc("club_attendance_stats", {
        _club_id: clubId!,
        _category_id: catId || undefined,
        _since: sinceFor(range) ?? undefined,

      });
      if (error) throw error;
      return data as unknown as Stats;
    },
  });

  const stats = statsQ.data;
  const rows = stats?.jugadoras ?? [];

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <span className="chip">
        <BarChart3 size={12} className="inline-block -mt-0.5" /> Temporada
      </span>
      <h1 className="mt-4 text-display text-4xl md:text-5xl font-bold leading-[0.95]">
        <span className="marker-underline">Asistencia</span>
      </h1>
      <p className="mt-3 text-ink/60">
        Quién está viniendo y a quién le está costando. Solo cuenta eventos ya pasados.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={catId}
          onChange={(e) => setCatId(e.target.value)}
          className="rounded-xl border-2 border-ink bg-card px-3 py-2 text-sm font-semibold"
        >
          <option value="">Todas las categorías</option>
          {(catsQ.data ?? []).map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as RangeKey)}
          className="rounded-xl border-2 border-ink bg-card px-3 py-2 text-sm font-semibold"
        >
          <option value="todo">Toda la temporada</option>
          <option value="30">Últimos 30 días</option>
          <option value="mes">Este mes</option>
        </select>
      </div>

      {statsQ.isLoading ? (
        <div className="mt-8 space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-ink/10" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-ink/10" />
          ))}
        </div>
      ) : statsQ.isError ? (
        <p className="mt-8 text-sm text-pa-red">No pudimos cargar la asistencia.</p>
      ) : !stats || stats.resumen.eventos_pasados === 0 ? (
        <p className="mt-8 text-sm text-ink/60">
          Aún no hay eventos pasados para calcular asistencia.
        </p>
      ) : (
        <>
          <section className="mt-8 rounded-2xl border-2 border-ink bg-card p-6">
            <p className="text-xs font-mono uppercase tracking-wider text-ink/50">
              Asistencia del equipo
            </p>
            <p className="mt-1 font-display text-5xl font-bold">
              {stats.resumen.equipo_pct != null ? `${stats.resumen.equipo_pct}%` : "—"}
            </p>
            <p className="mt-1 text-sm text-ink/60">
              {stats.resumen.eventos_pasados} eventos
            </p>
          </section>

          <ul className="mt-6 space-y-3">
            {rows.map((r) => {
              const marcadas = r.asistio + r.falto;
              const low = r.pct != null && r.pct < 60;
              return (
                <li key={r.player_id} className="rounded-2xl border-2 border-ink bg-card p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-bold truncate">{r.full_name}</p>
                      {r.category_name && (
                        <p className="text-xs font-mono uppercase tracking-wider text-ink/50">
                          {r.category_name}
                        </p>
                      )}
                    </div>
                    <span className={`font-display text-xl font-bold ${low ? "text-pa-red" : ""}`}>
                      {r.pct != null ? `${r.pct}%` : "sin datos aún"}
                    </span>
                  </div>

                  <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
                    <div
                      className={`h-full rounded-full ${low ? "bg-pa-red" : "bg-lime"}`}
                      style={{ width: `${r.pct ?? 0}%` }}
                    />
                  </div>

                  <p className="mt-2 text-sm text-ink/60">
                    {r.asistio}/{marcadas} asistencias · {r.falto} faltas
                    {r.sin_marcar > 0 && <> · {r.sin_marcar} sin marcar</>}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
