import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { getPlayerInvite } from "@/lib/invites.functions";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/unirse/$token")({
  head: () => ({
    meta: [
      { title: "FullTime — Únete a tu equipo" },
      { name: "description", content: "Acepta la invitación de tu Profe y confirma tus convocatorias." },
      { property: "og:title", content: "FullTime — Únete a tu equipo" },
      { property: "og:description", content: "Acepta la invitación de tu Profe y confirma tus convocatorias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinPage,
});

type Preview =
  | {
      ok: true;
      player_id: string;
      player_name: string;
      club_id: string;
      club_name: string;
      already_claimed: boolean;
      expired?: boolean;
      expected_email_masked?: string | null;
    }
  | { ok: false; reason: "invalid" | "not_found" | "already_claimed" | "other" };

function JoinPage() {
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
        const data = await getPlayerInvite({ data: { token } });
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
    navigate({ to: "/auth", search: { mode: "login", redirect: `/unirse/${token}` }, replace: true });
  }

  async function accept() {
    setAccepting(true);
    setError("");
    setNeedsOtherAccount(false);
    const { data, error } = await supabase.rpc("accept_player_invite", { _token: token });
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
      } else if (result?.reason === "already_claimed") {
        setError("Este link ya fue usado por otra cuenta.");
      } else if (result?.reason === "already_member") {
        setError("Ya eres parte de este club como Profe. Este link es para vincular la ficha de una jugadora.");
      } else if (result?.reason === "already_in_other_club") {
        setError("Esta cuenta ya pertenece a otro club. Entra con la cuenta de la jugadora o pídele a tu Profe un nuevo link.");
      } else if (result?.reason === "not_found") {
        setError("El link ya no es válido.");
      } else {
        setError("No pudimos aceptar la invitación.");
      }
      return;
    }
    navigate({ to: "/mis-convocatorias", replace: true });
  }

  const returnTo = `/unirse/${token}`;


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
          Invitación
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
            <p className="text-sm text-ink/60">Te invitaron al equipo</p>
            <h1 className="mt-1 font-display text-3xl md:text-4xl font-bold text-ink leading-tight">
              {preview.club_name}
            </h1>
            <p className="mt-3 text-base text-ink/80">
              como <span className="font-semibold text-ink">{preview.player_name}</span>.
            </p>

            {!session ? (
              <>
                <p className="mt-5 text-sm text-ink/70">
                  Crea tu cuenta o inicia sesión para confirmar tus convocatorias desde tu celular.
                </p>
                {preview.expected_email_masked && (
                  <p className="mt-2 text-sm text-ink/60">
                    Este enlace es solo para el correo{" "}
                    <span className="font-semibold text-ink">{preview.expected_email_masked}</span>.
                  </p>
                )}
                <div className="mt-5">
                  <Link
                    to="/auth"
                    search={{ mode: "signup", redirect: returnTo }}
                    className="btn-primary block w-full !py-3 text-center"
                  >
                    Crear mi contraseña
                  </Link>
                  <div className="mt-3 text-center">
                    <Link
                      to="/auth"
                      search={{ mode: "login", redirect: returnTo }}
                      className="text-xs font-medium text-ink/50 underline underline-offset-4 hover:text-ink transition-colors"
                    >
                      Ya tengo cuenta
                    </Link>
                  </div>
                </div>
              </>
            ) : preview.already_claimed ? (
              <>
                <p className="mt-5 text-sm text-ink/70">
                  Esta ficha ya está vinculada a una cuenta. Si eres tú, ya puedes ver tus convocatorias.
                </p>
                <Link
                  to="/mis-convocatorias"
                  className="btn-primary mt-5 inline-flex !py-3"
                >
                  Ver mis convocatorias
                </Link>
              </>
            ) : (
              <>
                <p className="mt-5 text-sm text-ink/70">
                  Toca aceptar para vincular esta ficha a tu cuenta y empezar a recibir convocatorias.
                </p>
                {error && (
                  <div className="mt-4 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
                    {error}
                  </div>
                )}
                {needsOtherAccount ? (
                  <button
                    onClick={switchAccount}
                    className="btn-primary mt-5 !py-3 w-full"
                  >
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
