import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, MapPin, Check, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyActiveClub, isStaffRole } from "@/lib/active-club";
import { formatShort, kindLabel } from "@/lib/call-ups";

export const Route = createFileRoute("/_authenticated/mis-convocatorias")({
  head: () => ({
    meta: [
      { title: "FullTime — Mis convocatorias" },
      { name: "description", content: "Convocatorias en las que te han incluido." },
      { property: "og:title", content: "FullTime — Mis convocatorias" },
      { property: "og:description", content: "Convocatorias en las que te han incluido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyCallUps,
});

function MyCallUps() {
  const { user } = Route.useRouteContext();
  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });
  const homePath = clubQ.data && !isStaffRole(clubQ.data.role) ? "/inicio" : "/dashboard";

  const meQ = useQuery({
    queryKey: ["me-player-id"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const myPlayerId = meQ.data?.id;

  const q = useQuery({
    queryKey: ["my-call-ups", myPlayerId],
    enabled: !!myPlayerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_up_players")
        .select("id, status, read_at, responded_at, attended, call_ups(id, kind, starts_at, place, categories(name))")
        .eq("player_id", myPlayerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .filter((r: any) => r.call_ups)
        .map((r: any) => ({
          rowId: r.id, status: r.status, read_at: r.read_at, attended: r.attended,
          ...r.call_ups, category_name: r.call_ups?.categories?.name ?? "",
        }));
    },
  });

  const items = q.data ?? [];
  const now = Date.now();
  const upcoming = items.filter((i: any) => new Date(i.starts_at).getTime() >= now - 2 * 60 * 60 * 1000);
  const past = items.filter((i: any) => !upcoming.includes(i));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-paper/70 border-b border-ink/10">
        <div className="mx-auto max-w-4xl px-5 py-3.5 flex items-center">
          <Link to={homePath} className="flex items-center gap-2 text-sm font-semibold hover:opacity-70">
            <ArrowLeft size={16} /> Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <span className="chip"><span className="h-1.5 w-1.5 rounded-full bg-lime inline-block" /> Tus convocatorias</span>
        <h1 className="mt-4 text-display text-4xl md:text-5xl font-bold leading-[0.95]">
          Mis <span className="marker-underline">convocatorias</span>
        </h1>

        <Section title="Próximas" items={upcoming} loading={q.isLoading} empty="No tienes convocatorias próximas." />
        <Section title="Anteriores" items={past} loading={q.isLoading} empty="No hay historial todavía." past />
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "going")
    return <span className="inline-flex items-center gap-1 rounded-full bg-lime px-2.5 py-0.5 text-xs font-bold text-ink"><Check size={12}/> Voy</span>;
  if (status === "declined")
    return <span className="inline-flex items-center gap-1 rounded-full bg-pa-red px-2.5 py-0.5 text-xs font-bold text-paper"><X size={12}/> No puedo</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-bold text-ink"><Clock size={12}/> Sin responder</span>;
}

function AttendanceBadge({ attended }: { attended: boolean | null }) {
  if (attended === true)
    return <span className="inline-flex items-center gap-1 rounded-full bg-lime px-2.5 py-0.5 text-xs font-bold text-ink"><Check size={12}/> Asististe</span>;
  if (attended === false)
    return <span className="inline-flex items-center gap-1 rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-bold text-ink"><X size={12}/> No asististe</span>;
  return null;
}

function Section({ title, items, loading, empty, past }: { title: string; items: any[]; loading: boolean; empty: string; past?: boolean }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-ink/50">Cargando...</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink/20 bg-card p-6 text-center text-ink/50 text-sm">{empty}</div>
        ) : (
          items.map((c: any) => (
            <Link
              key={c.rowId}
              to="/call-ups/$id"
              params={{ id: c.id }}
              className="block rounded-2xl border-2 border-ink bg-card p-5 hover:shadow-[6px_6px_0_0_var(--color-lime)] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${c.kind === "partido" ? "bg-pa-red text-paper" : "bg-lime text-ink"}`}>
                      {kindLabel(c.kind)}
                    </span>
                    <span className="text-xs font-mono uppercase tracking-wider text-ink/50">{c.category_name}</span>
                  </div>
                  <h3 className="mt-2 font-display text-xl font-bold flex items-center gap-2">
                    <Calendar size={18} className="text-ink/50" /> {formatShort(c.starts_at)}
                  </h3>
                  {c.place && (
                    <p className="mt-1 text-sm text-ink/60 flex items-center gap-1.5">
                      <MapPin size={14} /> {c.place}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={c.status} />
                  {past && <AttendanceBadge attended={c.attended} />}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
