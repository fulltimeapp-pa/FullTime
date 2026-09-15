import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

async function switchAccount() {
  await supabase.auth.signOut();
  window.location.href = "/auth?mode=login";
}

export function CTA() {
  const { isAuthenticated, loading } = useSession();

  return (
    <section className="relative py-20 md:py-32">
      <div className="mx-auto max-w-5xl px-5">
        <div className="relative bg-ink text-paper rounded-3xl p-10 md:p-16 overflow-hidden border-2 border-ink">
          {/* Big decorative "GOL" */}
          <div aria-hidden className="pointer-events-none absolute -right-6 -bottom-16 md:-right-10 md:-bottom-24 font-display font-extrabold text-[10rem] md:text-[18rem] leading-none text-lime/10 select-none">
            GOL
          </div>
          {/* Flag stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 flag-stripe" />

          <div className="relative reveal">
            <span className="chip !bg-transparent !border-paper !text-paper mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-lime inline-block" />
              Empieza hoy
            </span>
            <h2 className="text-display text-4xl md:text-6xl font-bold leading-[0.95] max-w-3xl">
              Tu próxima temporada<br />
              <span className="text-lime">empieza organizada.</span>
            </h2>
            <p className="mt-5 text-lg text-paper/70 max-w-xl">
              Crea tu cuenta en menos de un minuto. Invita a tu plantel. Manda la primera convocatoria hoy mismo.
            </p>

            <div className="mt-8 min-h-[48px]">
              {loading ? null : isAuthenticated ? (
                <div className="flex flex-col items-start gap-3">
                  <a href="/dashboard" className="btn-primary !bg-lime !text-ink !shadow-none hover:!shadow-[0_3px_0_0_var(--color-paper)]">
                    Ir a mi panel
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                  <button
                    type="button"
                    onClick={switchAccount}
                    className="text-sm font-semibold text-paper/70 underline underline-offset-4 hover:text-lime"
                  >
                    Entrar con otra cuenta
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">

                  <a href="/auth?mode=signup" className="btn-primary !bg-lime !text-ink !shadow-none hover:!shadow-[0_3px_0_0_var(--color-paper)]">
                    Crear cuenta gratis
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                  <a href="/auth?mode=login" className="btn-ghost !border-paper !text-paper hover:!bg-paper hover:!text-ink">
                    Ya tengo cuenta
                  </a>
                </div>
              )}
            </div>

            <p className="mt-5 text-sm text-paper/60 font-mono">
              Sin lista de espera · Sin aprobación · Gratis para empezar
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
