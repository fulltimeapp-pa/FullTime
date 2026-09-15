import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StaffShell } from "@/components/staff/StaffShell";
import { getMyActiveClub } from "@/lib/active-club";
import { formatShort, type CallUp } from "@/lib/call-ups";

export const Route = createFileRoute("/_authenticated/call-ups/")({
  head: () => ({
    meta: [
      { title: "FullTime — Partidos" },
      { name: "description", content: "Convocatorias de partidos de tu equipo." },
      { property: "og:title", content: "FullTime — Partidos" },
      { property: "og:description", content: "Convocatorias de partidos de tu equipo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <StaffShell>
      <CallUpsPage />
    </StaffShell>
  ),
});

type WithCounts = CallUp & {
  category_name: string;
  total: number;
  going: number;
  declined: number;
  pending: number;
};

function CallUpsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });
  const clubId = clubQ.data?.club_id;

  const listQ = useQuery({
    queryKey: ["call-ups", "partido", clubId],
    enabled: !!clubId,
    queryFn: async (): Promise<WithCounts[]> => {
      const { data: cus, error } = await supabase
        .from("call_ups")
        .select("id, club_id, category_id, kind, starts_at, place, note, objetivo, created_by, created_at, categories(name)")
        .eq("club_id", clubId!)
        .eq("kind", "partido")
        .order("starts_at", { ascending: false });
      if (error) throw error;

      const ids = (cus ?? []).map((c) => c.id);
      let responses: { call_up_id: string; status: string }[] = [];
      if (ids.length) {
        const { data: r, error: rErr } = await supabase
          .from("call_up_players")
          .select("call_up_id, status")
          .in("call_up_id", ids);
        if (rErr) throw rErr;
        responses = r ?? [];
      }

      return (cus ?? []).map((c: any) => {
        const rs = responses.filter((x) => x.call_up_id === c.id);
        return {
          id: c.id,
          club_id: c.club_id,
          category_id: c.category_id,
          kind: c.kind,
          starts_at: c.starts_at,
          place: c.place,
          note: c.note,
          objetivo: c.objetivo,
          created_by: c.created_by,
          created_at: c.created_at,
          category_name: c.categories?.name ?? "",
          total: rs.length,
          going: rs.filter((x) => x.status === "going").length,
          declined: rs.filter((x) => x.status === "declined").length,
          pending: rs.filter((x) => x.status === "pending").length,
        };
      });
    },
  });

  useEffect(() => {
    if (!clubId) return;
    const ch = supabase
      .channel(`cu-list-partido-${clubId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "call_ups", filter: `club_id=eq.${clubId}` }, () => {
        qc.invalidateQueries({ queryKey: ["call-ups", "partido", clubId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "call_up_players" }, () => {
        qc.invalidateQueries({ queryKey: ["call-ups", "partido", clubId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clubId, qc]);

  const items = listQ.data ?? [];
  const now = Date.now();
  const { upcoming, past } = useMemo(() => {
    const up: WithCounts[] = [];
    const pa: WithCounts[] = [];
    for (const it of items) {
      if (new Date(it.starts_at).getTime() >= now - 2 * 60 * 60 * 1000) up.push(it);
      else pa.push(it);
    }
    up.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    return { upcoming: up, past: pa };
  }, [items, now]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-paper/70 border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-5 py-3.5 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm font-semibold hover:opacity-70">
            <ArrowLeft size={16} /> Volver al panel
          </Link>
          <button
            onClick={() => navigate({ to: "/call-ups/new" })}
            className="btn-primary !py-2 !px-4 !text-sm"
          >
            <Plus size={16} /> Nuevo partido
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <span className="chip"><span className="h-1.5 w-1.5 rounded-full bg-pa-red inline-block" /> Partidos</span>
        <h1 className="mt-4 text-display text-4xl md:text-5xl font-bold leading-[0.95]">
          Convoca para el <span className="marker-underline">partido</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Arma la lista, envíala y mira en vivo quién confirma.
        </p>

        <Section title="Próximos" items={upcoming} loading={listQ.isLoading} empty="No tienes partidos próximos. Crea uno para empezar." />
        <Section title="Historial" items={past} loading={listQ.isLoading} empty="Todavía no hay partidos pasados." />
      </main>
    </div>
  );
}

function Section({ title, items, loading, empty }: { title: string; items: WithCounts[]; loading: boolean; empty: string }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-ink/50">Cargando...</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink/20 bg-card p-6 text-center text-ink/50 text-sm">
            {empty}
          </div>
        ) : (
          items.map((c) => (
            <Link
              key={c.id}
              to="/call-ups/$id"
              params={{ id: c.id }}
              className="block rounded-2xl border-2 border-ink bg-card p-5 hover:shadow-[6px_6px_0_0_var(--color-lime)] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide bg-pa-red text-paper">
                      Partido
                    </span>
                    <span className="text-xs font-mono uppercase tracking-wider text-ink/50">{c.category_name}</span>
                  </div>
                  <h3 className="mt-2 font-display text-xl font-bold flex items-center gap-2">
                    <Calendar size={18} className="text-ink/50" /> {formatShort(c.starts_at)}
                  </h3>
                  <p className="mt-1 text-sm text-ink/60 flex items-center gap-1.5">
                    <MapPin size={14} /> {c.place}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-3xl font-display font-bold leading-none">
                    {c.going}<span className="text-ink/30">/{c.total}</span>
                  </div>
                  <div className="text-xs text-ink/50 mt-1 font-medium">confirmadas</div>
                  {c.declined > 0 && (
                    <div className="text-xs text-pa-red mt-0.5 font-semibold">{c.declined} no puede</div>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
