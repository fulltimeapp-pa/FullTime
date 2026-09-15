import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, UserRound, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyActiveClub, isStaffRole } from "@/lib/active-club";
import { formatShort, kindLabel } from "@/lib/call-ups";
import { Logo } from "@/components/brand/Logo";
import { ClubCrest } from "@/components/brand/ClubCrest";

import { PushOptIn } from "@/components/push/PushOptIn";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "FullTime — Tu inicio" },
      { name: "description", content: "Tus convocatorias y tu perfil, en un solo lugar." },
      { property: "og:title", content: "FullTime — Tu inicio" },
      { property: "og:description", content: "Tus convocatorias y tu perfil, en un solo lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayerHome,
});

function PlayerHome() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });

  // Staff never belongs here — bounce back to their panel.
  useEffect(() => {
    if (!clubQ.isSuccess) return;
    const data = clubQ.data;
    if (!data) return;
    if (isStaffRole(data.role)) navigate({ to: "/dashboard", replace: true });
  }, [clubQ.isSuccess, clubQ.data, navigate]);

  // Player's own record (name + basics).
  const meQ = useQuery({
    queryKey: ["me-player"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, full_name, jersey_number, position, club_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Upcoming call-ups for THIS player only (filter by player_id, not RLS-wide).
  const callUpsQ = useQuery({
    queryKey: ["my-call-ups-upcoming", meQ.data?.id],
    enabled: !!meQ.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_up_players")
        .select("id, status, call_ups(id, kind, starts_at, place)")
        .eq("player_id", meQ.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .filter((r: any) => r.call_ups)
        .map((r: any) => ({
          rowId: r.id,
          status: r.status,
          ...r.call_ups,
        }))
        .filter((r: any) => new Date(r.starts_at).getTime() >= Date.now() - 2 * 60 * 60 * 1000)
        .sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .slice(0, 3);
    },
  });

  const displayName =
    meQ.data?.full_name?.trim() ||
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Jugadora";
  const firstName = displayName.split(" ")[0];
  const clubName = clubQ.data?.club?.name ?? "";

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  const upcoming = callUpsQ.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-paper/70 border-b border-ink/10">
        <div className="mx-auto max-w-5xl px-5 py-3.5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <Logo className="h-9 w-9" />
            <span className="font-display text-lg font-bold tracking-tight">
              FullTime<span className="text-pa-red">.</span>
            </span>
          </a>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline text-ink/60 font-mono text-xs">{user.email}</span>
            <button onClick={signOut} className="btn-ghost !py-2 !px-4 !text-sm">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 md:py-14">
        <div className="max-w-3xl">
          <span className="chip">
            <span className="h-1.5 w-1.5 rounded-full bg-lime inline-block" />
            Tu inicio
          </span>
          <h1 className="mt-4 text-display text-4xl md:text-6xl font-bold leading-[0.95]">
            Hola, {firstName} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {clubName
              ? (
                <span className="inline-flex items-center gap-2">
                  <ClubCrest logoPath={clubQ.data?.club?.logo_path} name={clubName} className="h-7 w-7 text-sm" />
                  <span>Juegas en <span className="font-semibold text-ink">{clubName}</span>.</span>
                </span>
              )
              : "Cargando tu club..."}

          </p>
        </div>

        <div className="mt-8">
          <PushOptIn />
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <Link
            to="/mis-convocatorias"
            className="group block rounded-2xl border-2 border-ink bg-card p-6 md:p-7 hover:shadow-[6px_6px_0_0_var(--color-lime)] transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="chip">
                  <Calendar size={12} className="inline-block -mt-0.5" /> Convocatorias
                </span>
                <h3 className="mt-3 font-display text-2xl font-bold">
                  Mis <span className="marker-underline">convocatorias</span>
                </h3>
                <p className="mt-1.5 text-sm text-ink/60">
                  Revisa a qué te han convocado y confirma si vas.
                </p>
              </div>
              <span className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lime text-ink font-display font-bold text-xl group-hover:scale-110 transition-transform">
                →
              </span>
            </div>
          </Link>

          <Link
            to="/mi-perfil"
            className="group block rounded-2xl border-2 border-ink bg-card p-6 md:p-7 hover:shadow-[6px_6px_0_0_var(--color-lime)] transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="chip">
                  <UserRound size={12} className="inline-block -mt-0.5" /> Perfil
                </span>
                <h3 className="mt-3 font-display text-2xl font-bold">
                  Mi <span className="marker-underline">perfil</span>
                </h3>
                <p className="mt-1.5 text-sm text-ink/60">
                  Tus datos, tu dorsal y tu foto.
                </p>
              </div>
              <span className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-lime font-display font-bold text-xl group-hover:scale-110 transition-transform">
                →
              </span>
            </div>
          </Link>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl md:text-3xl font-bold">
            Próximas <span className="marker-underline">convocatorias</span>
          </h2>
          {callUpsQ.isLoading ? (
            <p className="mt-5 text-sm text-ink/50">Cargando...</p>
          ) : upcoming.length === 0 ? (
            <p className="mt-5 text-sm text-ink/60">
              No tienes convocatorias próximas. Te avisaremos aquí cuando llegue una.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {upcoming.map((c: any) => (
                <li key={c.rowId}>
                  <Link
                    to="/mis-convocatorias"
                    className="block rounded-2xl border-2 border-ink bg-card p-5 hover:bg-lime/10 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <span className="chip">{kindLabel(c.kind)}</span>
                        <p className="mt-2 font-display text-lg font-bold">
                          {formatShort(c.starts_at)}
                        </p>
                        {c.place && (
                          <p className="mt-1 text-sm text-ink/60 inline-flex items-center gap-1">
                            <MapPin size={12} /> {c.place}
                          </p>
                        )}
                      </div>
                      <StatusPill status={c.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "going")
    return <span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-bold text-ink">Vas</span>;
  if (status === "declined")
    return <span className="rounded-full bg-pa-red px-2.5 py-0.5 text-xs font-bold text-paper">No vas</span>;
  return <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-bold text-ink">Responder</span>;
}
