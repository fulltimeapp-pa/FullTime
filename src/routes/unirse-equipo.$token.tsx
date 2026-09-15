import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { getStaffInvite } from "@/lib/invites.functions";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/unirse-equipo/$token")({
  head: () => ({
    meta: [
      { title: "FullTime — Únete al cuerpo técnico" },
      { name: "description", content: "Acepta la invitación al cuerpo técnico del club." },
      { property: "og:title", content: "FullTime — Únete al cuerpo técnico" },
      { property: "og:description", content: "Acepta la invitación al cuerpo técnico del club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinStaffPage,
});

type Preview =
  | {
      ok: true;
      club_id: string;
      club_name: string;
      role: "admin" | "coach";
      already_accepted: boolean;
      expired?: boolean;
      expected_email_masked?: string | null;
    }
  | { ok: false; reason: "invalid" | "not_found" | "other" };

const ROLE_LABEL = { admin: "Admin", coach: "Cuerpo técnico" } as const;

function JoinStaffPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string>("");
  const [needsOtherAccount, setNeedsOtherAccount] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getStaffInvite({ data: { token } });
        if (!alive) return;
        setPreview((data as unknown as Preview) ?? { ok: false, reason: "not_found" });
      } catch {
        if (!alive) return;
        setPreview({ ok: false, reason: "other" });
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  async function switchAccount() {
    await supabase.auth.signOut();
    navigate({
      to: "/auth",
      search: { mode: "login", redirect: `/unirse-equipo/${token}` },
      replace: true,
    });
  }

  async function accept() {
    setAccepting(true);
    setError("");
    setNeedsOtherAccount(false);
    const { data, error } = await supabase.rpc("accept_staff_invite", { _token: token });
    setAccepting(false);
    if (error) {
      setError("No pudimos aceptar la invitación. Vuelve a intentarlo.");
      return;
    }
    const result = data as { ok: boolean; reason?: string; expected_email_masked?: string | null } | null;
    if (!result?.ok) {
      if (result?.reason === "email_mismatch") {
        const masked =
          result.expected_email_masked ??
          (preview?.ok ? preview.expected_email_masked : null) ??
          "otro correo";
        setError(`Este enlace es para el correo ${masked}. Cierra sesión y entra con ese correo.`);
        setNeedsOtherAccount(true);
      } else if (result?.reason === "expired") {
        setError("Este enlace venció. Pídele a tu profe uno nuevo.");
      } else if (result?.reason === "already_used") setError("Este link ya fue usado.");
      else if (result?.reason === "already_in_other_club")
        setError("Tu cuenta ya pertenece a otro club con datos. Entra con otra cuenta o pídele a tu Profe un nuevo link.");
      else if (result?.reason === "not_found") setError("El link ya no es válido.");
      else setError("No pudimos aceptar la invitación.");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  const returnTo = typeof window !== "undefined" ? `/unirse-equipo/${token}` : "";


  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="mx-auto w-full max-w-3xl px-5 py-5">
        <Link to="/" className="inline-flex items-center gap-2">
          <Logo className="h-9 w-9" />
          <span className="font-display text-lg font-bold tracking-tight">
            FullTime<span className="text-pa-red">.</span>
          </span>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-xl px-5 py-8 md:py-14 flex-1">
        <span className="chip">
          <span className="h-1.5 w-1.5 rounded-full bg-lime inline-block" />
          Invitación al cuerpo técnico
        </span>

        {loading || sessionLoading ? (
          <div className="mt-6 rounded-2xl border-2 border-ink/10 bg-paper p-6 text-sm text-ink/60">
            Cargando invitación...
          </div>
        ) : !preview?.ok ? (
          <div className="mt-6 rounded-2xl border-2 border-pa-red bg-pa-red/10 p-6">
            <h1 className="font-display text-2xl font-bold text-ink">Este link no es válido</h1>
            <p className="mt-2 text-sm text-ink/70">
              Puede que la invitación haya sido eliminada o que el enlace esté mal copiado. Pídele a tu Profe uno nuevo.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center justify-center rounded-xl border-2 border-ink bg-paper px-4 py-2.5 text-sm font-semibold hover:bg-ink hover:text-lime transition-colors"
            >
              Ir al inicio
            </Link>
          </div>
        ) : preview.expired ? (
          <div className="mt-6 rounded-2xl border-2 border-pa-red bg-pa-red/10 p-6">
            <h1 className="font-display text-2xl font-bold text-ink">Este enlace venció</h1>
            <p className="mt-2 text-sm text-ink/70">Pídele a tu profe uno nuevo.</p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center justify-center rounded-xl border-2 border-ink bg-paper px-4 py-2.5 text-sm font-semibold hover:bg-ink hover:text-lime transition-colors"
            >
              Ir al inicio
            </Link>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border-2 border-ink bg-paper p-6 shadow-[6px_6px_0_0_var(--color-lime)]">
            <p className="text-sm text-ink/60">Te invitaron al cuerpo técnico de</p>
            <h1 className="mt-1 font-display text-3xl md:text-4xl font-bold text-ink leading-tight">
              {preview.club_name}
            </h1>
            <p className="mt-3 text-base text-ink/80">
              como <span className="font-semibold text-ink">{ROLE_LABEL[preview.role]}</span>.
            </p>

            {!session ? (
              <>
                <p className="mt-5 text-sm text-ink/70">
                  Crea tu cuenta o inicia sesión para aceptar.
                </p>
                {preview.expected_email_masked && (
                  <p className="mt-2 text-sm text-ink/60">
                    Este enlace es solo para el correo{" "}
                    <span className="font-semibold text-ink">{preview.expected_email_masked}</span>.
                  </p>
                )}
                <div className="mt-5 flex flex-col sm:flex-row gap-2">
                  <Link
                    to="/auth"
                    search={{ mode: "signup", redirect: returnTo }}
                    className="btn-primary flex-1 !py-3 text-center"
                  >
                    Crear cuenta
                  </Link>
                  <Link
                    to="/auth"
                    search={{ mode: "login", redirect: returnTo }}
                    className="flex-1 inline-flex items-center justify-center rounded-xl border-2 border-ink bg-paper px-4 py-3 text-sm font-semibold hover:bg-ink hover:text-lime transition-colors"
                  >
                    Ya tengo cuenta
                  </Link>
                </div>
              </>
            ) : preview.already_accepted ? (
              <>
                <p className="mt-5 text-sm text-ink/70">
                  Esta invitación ya fue aceptada. Si eres tú, entra al panel.
                </p>
                <Link to="/dashboard" className="btn-primary mt-5 inline-flex !py-3">
                  Ir al panel
                </Link>
              </>
            ) : (
              <>
                <p className="mt-5 text-sm text-ink/70">
                  Toca aceptar para sumarte al cuerpo técnico de {preview.club_name}.
                </p>
                {error && (
                  <div className="mt-4 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
                    {error}
                  </div>
                )}
                {needsOtherAccount ? (
                  <button onClick={switchAccount} className="btn-primary mt-5 !py-3 w-full">
                    Cerrar sesión y entrar con ese correo
                  </button>
                ) : (
                  <button
                    onClick={accept}
                    disabled={accepting}
                    className="btn-primary mt-5 !py-3 w-full disabled:opacity-70"
                  >
                    {accepting ? "Aceptando..." : "Aceptar invitación"}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
