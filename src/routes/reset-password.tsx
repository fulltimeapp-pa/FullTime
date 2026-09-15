import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "FullTime — Nueva contraseña" },
      { name: "description", content: "Elige una nueva contraseña para tu cuenta de FullTime." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [top, setTop] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errParam = url.searchParams.get("error") || hash.get("error") || hash.get("error_description");

    if (errParam) {
      setExpired(true);
      return;
    }

    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (session || event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
        setExpired(false);
      }
    });

    const code = url.searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(window.location.href).then(({ data, error: exErr }) => {
        if (!alive) return;
        if (data?.session && !exErr) setReady(true);
      });
    }

    supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session) setReady(true);
    });

    const timer = window.setTimeout(() => {
      if (alive) {
        setReady((r) => {
          if (!r) setExpired(true);
          return r;
        });
      }
    }, 3000);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      sub.data.subscription.unsubscribe();
    };
  }, []);


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setSubmitting(true);
    setError("");
    setTop("");
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setTop("No pudimos actualizar la contraseña. Vuelve a intentarlo.");
      setSubmitting(false);
      return;
    }
    setDone(true);
    setSubmitting(false);
    setTimeout(() => navigate({ to: "/dashboard", replace: true }), 1200);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-5 py-16">
        <Link to="/" className="font-display text-lg font-bold tracking-tight">
          FullTime<span className="text-pa-red">.</span>
        </Link>

        <div className="mt-8 rounded-2xl border-2 border-ink bg-card p-6 md:p-8 shadow-[6px_6px_0_0_var(--color-ink)]">
          <h1 className="font-display text-3xl font-bold leading-none">
            Elige una <span className="marker-underline">nueva contraseña</span>
          </h1>

          {!ready && expired ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border-2 border-pa-red bg-pa-red/10 p-4 text-sm font-medium text-pa-red">
                Este enlace venció o ya se usó. Pide uno nuevo.
              </div>
              <Link
                to="/auth"
                search={{ mode: "reset" }}
                className="btn-primary w-full !py-3.5 inline-flex justify-center"
              >
                Pedir un enlace nuevo
              </Link>
            </div>
          ) : !ready ? (
            <p className="mt-6 text-sm text-muted-foreground">Verificando el enlace...</p>

          ) : done ? (
            <div className="mt-6 rounded-xl border-2 border-ink bg-lime/20 p-4 text-sm font-medium">
              Contraseña actualizada. Te llevamos a tu club...
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Nueva contraseña</label>
                <input
                  type="password"
                  className={`w-full rounded-xl border-2 ${
                    error ? "border-pa-red" : "border-ink/20 focus:border-ink"
                  } bg-paper px-4 py-3 text-base outline-none placeholder:text-ink/40`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                />
                {error ? (
                  <p className="mt-1.5 text-sm font-medium text-pa-red">{error}</p>
                ) : (
                  <p className="mt-1.5 text-xs text-ink/50">Usa al menos 8 caracteres.</p>
                )}
              </div>
              {top && (
                <div className="rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
                  {top}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full !py-3.5 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? "Guardando..." : "Guardar contraseña"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
