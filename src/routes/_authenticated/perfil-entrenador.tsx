import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyActiveClub } from "@/lib/active-club";
import { StaffShell } from "@/components/staff/StaffShell";

export const Route = createFileRoute("/_authenticated/perfil-entrenador")({
  head: () => ({
    meta: [
      { title: "FullTime — Mi perfil" },
      { name: "description", content: "Tu perfil como entrenador/a en FullTime." },
      { property: "og:title", content: "FullTime — Mi perfil" },
      { property: "og:description", content: "Tu perfil como entrenador/a en FullTime." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  return (
    <StaffShell>
      <Perfil />
    </StaffShell>
  );
}

function Perfil() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const fullName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Profe";

  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });
  const clubName = clubQ.data?.club?.name ?? "";
  const role = clubQ.data?.role ?? "";

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:py-14">
      <span className="chip">
        <span className="h-1.5 w-1.5 rounded-full bg-lime inline-block" />
        Mi perfil
      </span>
      <h1 className="mt-3 text-display font-display text-4xl md:text-5xl font-bold leading-[0.95]">
        {fullName}
      </h1>

      <div className="mt-8 rounded-2xl border-2 border-ink bg-card p-6 space-y-4">
        <Field label="Correo" value={user.email ?? "—"} />
        <Field label="Club" value={clubName || "—"} />
        <Field label="Rol" value={role || "—"} />
      </div>

      <div className="mt-8">
        <button onClick={signOut} className="btn-ghost !text-pa-red border-pa-red hover:!bg-pa-red hover:!text-paper">
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-mono uppercase tracking-wider text-ink/50">{label}</div>
      <div className="mt-1 font-semibold text-ink break-words">{value}</div>
    </div>
  );
}
