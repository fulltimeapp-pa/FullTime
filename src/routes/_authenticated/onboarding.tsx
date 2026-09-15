import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyActiveClub, isStaffRole } from "@/lib/active-club";
import { Logo } from "@/components/brand/Logo";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "FullTime — Crea tu club" },
      { name: "description", content: "Un paso rápido para poner tu club a andar en FullTime." },
      { property: "og:title", content: "FullTime — Crea tu club" },
      {
        property: "og:description",
        content: "Un paso rápido para poner tu club a andar en FullTime.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const initialName = ((user.user_metadata?.full_name as string | undefined) ?? "").trim();
  const [fullName, setFullName] = useState(initialName);
  const [clubName, setClubName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const platformAdmin = usePlatformAdmin();

  const activeClubQuery = useQuery({
    queryKey: ["my-club"],
    queryFn: getMyActiveClub,
  });

  // La dueña de la plataforma nunca ve "crea tu club".
  useEffect(() => {
    if (platformAdmin.data === true) navigate({ to: "/panel-fulltime", replace: true });
  }, [platformAdmin.data, navigate]);

  // If a club appears mid-way, leave. Jugadora goes to her own home.
  useEffect(() => {
    if (!activeClubQuery.isSuccess) return;
    const data = activeClubQuery.data;
    if (data && !isStaffRole(data.role)) {
      navigate({ to: "/inicio", replace: true });
      return;
    }
    if (data?.club_id) navigate({ to: "/dashboard", replace: true });
  }, [activeClubQuery.isSuccess, activeClubQuery.data, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "Escribe tu nombre.";
    if (!clubName.trim()) errs.clubName = "Escribe el nombre de tu club.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    setTopError("");
    try {
      if (fullName.trim() !== initialName) {
        await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
      }
      const { error } = await supabase.rpc("create_my_club", { _name: clubName.trim() });
      if (error) throw error;
      await activeClubQuery.refetch();
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      console.error(err);
      setTopError(
        err instanceof Error
          ? `No pudimos crear el club. Detalle: ${err.message}`
          : "No pudimos crear el club. Vuelve a intentarlo.",
      );
      setSubmitting(false);
    }
  }

  if (platformAdmin.isLoading || platformAdmin.data === true) {
    return (
      <div className="min-h-screen bg-background text-foreground grid place-items-center">
        <p className="text-sm text-ink/50">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-5 py-10 md:py-16">
        <div className="mb-2 flex items-center gap-2">
          <Logo className="h-9 w-9" />
          <span className="font-display text-lg font-bold tracking-tight">
            FullTime<span className="text-pa-red">.</span>
          </span>
        </div>

        <a
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70 hover:text-ink transition-colors"
        >
          <span aria-hidden="true">←</span> Volver al inicio
        </a>

        <span className="chip">
          <span className="h-1.5 w-1.5 rounded-full bg-lime inline-block" />
          Último paso
        </span>
        <h1 className="mt-4 font-display text-3xl md:text-4xl font-bold leading-none">
          Crea tu <span className="marker-underline">club</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Ponle nombre a tu club y arrancamos. Puedes cambiarlo después.
        </p>

        <form
          onSubmit={onSubmit}
          noValidate
          className="mt-6 rounded-2xl border-2 border-ink bg-card p-6 md:p-8 shadow-[6px_6px_0_0_var(--color-ink)] space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1.5">Tu nombre</label>
            <input
              className={`w-full rounded-xl border-2 ${
                errors.fullName ? "border-pa-red" : "border-ink/20 focus:border-ink"
              } bg-paper px-4 py-3 text-base outline-none transition-colors placeholder:text-ink/40`}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Bárbara Chan"
              autoComplete="name"
            />
            {errors.fullName && (
              <p className="mt-1.5 text-sm font-medium text-pa-red">{errors.fullName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Nombre del club</label>
            <input
              className={`w-full rounded-xl border-2 ${
                errors.clubName ? "border-pa-red" : "border-ink/20 focus:border-ink"
              } bg-paper px-4 py-3 text-base outline-none transition-colors placeholder:text-ink/40`}
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Panteras FC"
              autoComplete="organization"
              autoFocus
            />
            {errors.clubName && (
              <p className="mt-1.5 text-sm font-medium text-pa-red">{errors.clubName}</p>
            )}
          </div>

          {topError && (
            <div className="rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
              {topError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full !py-3.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? "Creando club..." : "Crear club y entrar"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink/60">
          ¿Eres jugadora? No necesitas crear un club. Pídele a tu profe el enlace de invitación para unirte a tu equipo.
        </p>
      </div>
    </div>
  );
}
