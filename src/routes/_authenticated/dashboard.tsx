import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, MapPin, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyActiveClub, isStaffRole } from "@/lib/active-club";
import { formatShort, kindLabel } from "@/lib/call-ups";
import { StaffShell } from "@/components/staff/StaffShell";
import { PushOptIn } from "@/components/push/PushOptIn";
import { TrialBanner } from "@/components/staff/TrialBanner";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { ClubCrest } from "@/components/brand/ClubCrest";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "FullTime — Tu club" },
      { name: "description", content: "Panel de tu club en FullTime." },
      { property: "og:title", content: "FullTime — Tu club" },
      { property: "og:description", content: "Panel de tu club en FullTime." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const fullName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Profe";
  const firstName = fullName.split(" ")[0];

  const clubQuery = useQuery({
    queryKey: ["my-club"],
    queryFn: getMyActiveClub,
  });

  // Jugadora: send to her own home. Staff without club: onboarding.
  const isJugadora = clubQuery.isSuccess && clubQuery.data != null && !isStaffRole(clubQuery.data.role);
  const isStaffWithoutClub = clubQuery.isSuccess && clubQuery.data == null;

  const platformAdmin = usePlatformAdmin();
  const isOwner = platformAdmin.data === true;

  useEffect(() => {
    if (isJugadora) navigate({ to: "/inicio", replace: true });
    else if (isStaffWithoutClub) {
      if (platformAdmin.isLoading) return;
      navigate({ to: isOwner ? "/panel-fulltime" : "/onboarding", replace: true });
    }
  }, [isJugadora, isStaffWithoutClub, isOwner, platformAdmin.isLoading, navigate]);

  const club = clubQuery.data?.club ?? null;
  const clubId = clubQuery.data?.club_id;

  const categoriesQuery = useQuery({
    queryKey: ["categories", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("club_id", clubId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
  const categories = categoriesQuery.data ?? [];

  const [selectedCatId, setSelectedCatId] = useState<string>("");
  useEffect(() => {
    if (!selectedCatId && categories.length > 0) setSelectedCatId(categories[0].id);
  }, [categories, selectedCatId]);

  const selectedCategory = categories.find((c) => c.id === selectedCatId);

  const playersCountQuery = useQuery({
    queryKey: ["players-count", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubId!);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const playersCount = playersCountQuery.data ?? 0;

  const categoryPlayersCountQuery = useQuery({
    queryKey: ["players-count-category", clubId, selectedCatId],
    enabled: !!clubId && !!selectedCatId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubId!)
        .eq("category_id", selectedCatId!);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const categoryPlayersCount = categoryPlayersCountQuery.data ?? 0;

  const partidosQuery = useQuery({
    queryKey: ["dashboard-call-ups", "partido", clubId, selectedCatId],
    enabled: !!clubId,
    queryFn: async () => {
      let q = supabase
        .from("call_ups")
        .select("id, kind, starts_at, place, categories(name)")
        .eq("club_id", clubId!)
        .eq("kind", "partido")
        .gte("starts_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order("starts_at", { ascending: true })
        .limit(3);
      if (selectedCatId) q = q.eq("category_id", selectedCatId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const upcomingPartidos = partidosQuery.data ?? [];

  const entrenosQuery = useQuery({
    queryKey: ["dashboard-call-ups", "entreno", clubId, selectedCatId],
    enabled: !!clubId,
    queryFn: async () => {
      let q = supabase
        .from("call_ups")
        .select("id, kind, starts_at, place, objetivo, categories(name)")
        .eq("club_id", clubId!)
        .eq("kind", "entreno")
        .gte("starts_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order("starts_at", { ascending: true })
        .limit(3);
      if (selectedCatId) q = q.eq("category_id", selectedCatId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const upcomingEntrenos = entrenosQuery.data ?? [];

  const invitedCountQuery = useQuery({
    queryKey: ["players-invited-count", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubId!)
        .or("invited_at.not.is.null,user_id.not.is.null");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const callUpsCountQuery = useQuery({
    queryKey: ["call-ups-count", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("call_ups")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const steps = [
    {
      label: "Agrega tus jugadoras",
      hint: "Crea tus categorías y suma al plantel.",
      done: playersCount > 0,
      to: "/roster" as const,
      cta: "Ir al plantel",
    },
    {
      label: "Invita a tus jugadoras",
      hint: "Comparte el link por WhatsApp para que entren a la app.",
      done: (invitedCountQuery.data ?? 0) > 0,
      to: "/roster" as const,
      cta: "Invitar",
    },
    {
      label: "Crea tu primera convocatoria o entreno",
      hint: "En menos de un minuto tu equipo recibe el aviso.",
      done: (callUpsCountQuery.data ?? 0) > 0,
      to: "/call-ups/new" as const,
      cta: "Crear",
    },
  ];
  const stepsDone = steps.filter((s) => s.done).length;
  const showOnboarding =
    !!club &&
    playersCountQuery.isSuccess &&
    invitedCountQuery.isSuccess &&
    callUpsCountQuery.isSuccess &&
    stepsDone < steps.length;



  function createClub() {
    navigate({ to: "/onboarding" });
  }

  const clubError = clubQuery.error instanceof Error ? clubQuery.error.message : "";

  // Evita el flash: mientras se resuelve la membresía, o si es jugadora / staff sin club
  // (que serán redirigidos en el useEffect de arriba), no renderizamos el panel de entrenadora.
  if (clubQuery.isLoading || isJugadora || isStaffWithoutClub) {
    return (
      <div className="min-h-screen bg-background text-foreground grid place-items-center">
        <p className="text-sm text-ink/50">Cargando...</p>
      </div>
    );
  }

  return (
    <StaffShell>
      <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">

        {/* Greeting */}
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">
              <span className="h-1.5 w-1.5 rounded-full bg-lime inline-block" />
              Tu panel
            </span>
            {isOwner && (
              <Link
                to="/panel-fulltime"
                className="rounded-full border-2 border-ink bg-lime px-3 py-1 text-xs font-bold text-ink hover:bg-ink hover:text-paper transition-colors"
              >
                🛠 Panel de dueña
              </Link>
            )}
          </div>
          <h1 className="mt-4 text-display text-4xl md:text-6xl font-bold leading-[0.95]">
            Hola, {firstName} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {clubQuery.isError
              ? "No pudimos cargar tu club."
              : clubQuery.isLoading
              ? "Cargando tu club..."
              : club
                ? (
                  <span className="inline-flex items-center gap-2">
                    <ClubCrest logoPath={club.logo_path} name={club.name} className="h-7 w-7 text-sm" />
                    <span>Estás dirigiendo <span className="font-semibold text-ink">{club.name}</span>.</span>
                  </span>
                )

                : "Aún no tienes un club asociado."}
          </p>
          {clubQuery.isError && clubError && (
            <div className="mt-4 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
              Detalle: {clubError}
            </div>
          )}
          {!clubQuery.isLoading && (!club || clubQuery.isError) && (
            <button onClick={createClub} className="btn-primary mt-5">
              Crear mi club
            </button>
          )}
        </div>

        {club && (
          <div className="mt-6 max-w-3xl">
            <TrialBanner clubCreatedAt={club.created_at} clubId={clubId} />
          </div>
        )}

        {showOnboarding && (
          <section className="mt-6 max-w-3xl rounded-2xl border-2 border-ink bg-card p-5 md:p-6 shadow-[6px_6px_0_0_var(--color-lime)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl md:text-2xl font-bold">
                🚀 Primeros pasos para arrancar tu equipo
              </h2>
              <span className="chip">{stepsDone} de {steps.length}</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full border-2 border-ink bg-paper overflow-hidden">
              <div
                className="h-full bg-lime transition-all"
                style={{ width: `${(stepsDone / steps.length) * 100}%` }}
              />
            </div>
            <ol className="mt-5 space-y-3">
              {steps.map((s, i) => (
                <li
                  key={s.label}
                  className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-ink/15 bg-paper px-4 py-3"
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink text-sm font-bold ${
                      s.done ? "bg-lime text-ink" : "bg-paper text-ink/60"
                    }`}
                  >
                    {s.done ? "✓" : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${s.done ? "text-ink/50 line-through" : "text-ink"}`}>
                      {s.label}
                    </p>
                    {!s.done && <p className="text-sm text-ink/60">{s.hint}</p>}
                  </div>
                  {!s.done && (
                    <Link to={s.to} className="btn-primary !py-1.5 !px-3 !text-xs">
                      {s.cta}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}


        <div className="mt-8 max-w-3xl">
          <PushOptIn />
        </div>



        {/* Team selector */}
        <section className="mt-10">
          <label className="text-xs font-mono uppercase tracking-wider text-ink/50">
            Equipo
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {categoriesQuery.isLoading ? (
              <SkeletonText className="h-10 w-40" />
            ) : categoriesQuery.isError ? (
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-pa-red bg-pa-red/10 px-4 py-2 text-sm font-semibold text-pa-red">
                No pudimos cargar categorías
              </span>
            ) : categories.length === 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink/20 bg-paper px-4 py-2 text-sm font-semibold text-ink/50">
                  Sin categorías todavía
                </span>
                {club && (
                  <Link to="/roster" className="btn-primary !py-2 !px-4 !text-sm">
                    Crear primera categoría
                  </Link>
                )}
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="appearance-none rounded-full border-2 border-ink bg-paper pl-4 pr-9 py-2 text-sm font-semibold outline-none focus:bg-ink focus:text-lime transition-colors cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs">▾</span>
              </div>
            )}
            {club && categories.length > 0 && (
              <Link
                to="/roster"
                className="btn-ghost !py-2 !px-4 !text-sm inline-flex items-center gap-1.5"
              >
                <Users size={14} /> Gestionar categorías y plantel
              </Link>
            )}
          </div>
        </section>

        {/* Plantel shortcut */}
        {club && (
          <section className="mt-8">
            {categoryPlayersCountQuery.isLoading || categoriesQuery.isLoading ? (
              <SkeletonCard />
            ) : (
            <Link
              to="/roster"
              className="group block rounded-2xl border-2 border-ink bg-card p-6 md:p-7 hover:shadow-[6px_6px_0_0_var(--color-lime)] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="chip">
                    <Users size={12} className="inline-block -mt-0.5" /> Plantel
                  </span>
                  <h3 className="mt-3 font-display text-2xl font-bold">
                    {selectedCategory && categoryPlayersCount > 0 ? (
                      <>
                        {selectedCategory.name} · {categoryPlayersCount}{" "}
                        {categoryPlayersCount === 1 ? "jugadora" : "jugadoras"}
                      </>
                    ) : (
                      <>
                        Arma tu <span className="marker-underline">plantel</span>
                      </>
                    )}
                  </h3>
                  <p className="mt-1.5 text-sm text-ink/60">
                    {selectedCategory && categoryPlayersCount > 0
                      ? "Revisa, edita y sigue completando tu plantel."
                      : "Crea categorías, agrega jugadoras y prepara todo para invitarlas."}
                  </p>
                </div>
                <span className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lime text-ink font-display font-bold text-xl group-hover:scale-110 transition-transform">
                  {selectedCategory && categoryPlayersCount > 0 ? "→" : "+"}
                </span>
              </div>
            </Link>
            )}
          </section>
        )}

        {/* Partidos */}
        {club && (
          <section className="mt-8">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h2 className="font-display text-2xl md:text-3xl font-bold">
                Próximos <span className="marker-underline">partidos</span>
              </h2>
              <Link to="/call-ups/new" className="btn-primary !py-2 !px-4 !text-sm">
                <Plus size={16} /> Nuevo partido
              </Link>
            </div>
            {partidosQuery.isLoading ? (
              <div className="mt-5 space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : upcomingPartidos.length === 0 ? (
              <div className="mt-5 rounded-2xl border-2 border-dashed border-ink/20 bg-card p-8 md:p-10 text-center">
                <p className="text-ink/60 font-medium">Todavía no has creado un partido.</p>
                <p className="mt-1 text-sm text-ink/40">Convoca a tu equipo en menos de un minuto.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {upcomingPartidos.map((c: any) => (
                  <Link
                    key={c.id}
                    to="/call-ups/$id"
                    params={{ id: c.id }}
                    className="block rounded-2xl border-2 border-ink bg-card p-5 hover:shadow-[6px_6px_0_0_var(--color-lime)] transition-all"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide bg-pa-red text-paper">
                        {kindLabel(c.kind)}
                      </span>
                      <span className="text-xs font-mono uppercase tracking-wider text-ink/50">
                        {c.categories?.name}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-xl font-bold flex items-center gap-2">
                      <Calendar size={18} className="text-ink/50" /> {formatShort(c.starts_at)}
                    </h3>
                    <p className="mt-1 text-sm text-ink/60 flex items-center gap-1.5">
                      <MapPin size={14} /> {c.place}
                    </p>
                  </Link>
                ))}
                <Link to="/call-ups" className="block text-center text-sm font-semibold underline pt-1">
                  Ver todos los partidos
                </Link>
              </div>
            )}
          </section>
        )}

        {/* Entrenos */}
        {club && (
          <section className="mt-8">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h2 className="font-display text-2xl md:text-3xl font-bold">
                Próximos <span className="marker-underline">entrenos</span>
              </h2>
              <Link to="/entrenos/new" className="btn-primary !py-2 !px-4 !text-sm">
                <Plus size={16} /> Nuevo entreno
              </Link>
            </div>
            {entrenosQuery.isLoading ? (
              <div className="mt-5 space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : upcomingEntrenos.length === 0 ? (
              <div className="mt-5 rounded-2xl border-2 border-dashed border-ink/20 bg-card p-8 md:p-10 text-center">
                <p className="text-ink/60 font-medium">Todavía no has creado un entreno.</p>
                <p className="mt-1 text-sm text-ink/40">Define el objetivo y convoca al equipo.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {upcomingEntrenos.map((c: any) => (
                  <Link
                    key={c.id}
                    to="/call-ups/$id"
                    params={{ id: c.id }}
                    className="block rounded-2xl border-2 border-ink bg-card p-5 hover:shadow-[6px_6px_0_0_var(--color-lime)] transition-all"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide bg-lime text-ink">
                        {kindLabel(c.kind)}
                      </span>
                      <span className="text-xs font-mono uppercase tracking-wider text-ink/50">
                        {c.categories?.name}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-xl font-bold flex items-center gap-2">
                      <Calendar size={18} className="text-ink/50" /> {formatShort(c.starts_at)}
                    </h3>
                    <p className="mt-1 text-sm text-ink/60 flex items-center gap-1.5">
                      <MapPin size={14} /> {c.place}
                    </p>
                    {c.objetivo && (
                      <p className="mt-1 text-sm text-ink/70 italic line-clamp-1">Objetivo: {c.objetivo}</p>
                    )}
                  </Link>
                ))}
                <Link to="/entrenos" className="block text-center text-sm font-semibold underline pt-1">
                  Ver todos los entrenos
                </Link>
              </div>
            )}
          </section>
        )}


        {/* Player self view */}
        <section className="mt-10">
          <Link to="/mis-convocatorias" className="text-sm text-ink/50 hover:text-ink underline">
            ¿Te convocaron a un partido? Ve tus convocatorias
          </Link>
        </section>

      </main>
    </StaffShell>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border-2 border-ink bg-card p-5 animate-pulse">
      <div className="h-4 w-16 rounded bg-ink/10" />
      <div className="mt-3 h-6 w-3/4 rounded bg-ink/10" />
      <div className="mt-2 h-4 w-1/2 rounded bg-ink/10" />
    </div>
  );
}

function SkeletonText({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-ink/10 ${className ?? ""}`} />;
}
