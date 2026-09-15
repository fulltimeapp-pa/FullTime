import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";

async function switchAccount() {
  await supabase.auth.signOut();
  window.location.href = "/auth?mode=login";
}

const links = [
  { href: "#problema", label: "El problema" },
  { href: "#como", label: "Cómo funciona" },
  { href: "#features", label: "Herramientas" },
  { href: "#precios", label: "Precios" },
  { href: "#historia", label: "Historia" },
];

export function Nav() {
  const { isAuthenticated, loading } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 w-full backdrop-blur-md bg-paper/70 border-b border-ink/10">
      <div className="mx-auto max-w-6xl px-5 py-3.5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 group">
          <Logo className="h-9 w-9" />
          <span className="font-display text-lg font-bold tracking-tight">
            FullTime<span className="text-pa-red">.</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7 text-sm font-medium">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-lime-deep transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        {/* Auth + mobile toggle */}
        <div className="flex items-center gap-2 min-h-[36px]">
          {loading ? null : isAuthenticated ? (
            <div className="hidden md:flex flex-col items-end gap-0.5">
              <Link to="/dashboard" className="btn-primary !py-2 !px-4 !text-sm">
                Ir a mi panel
              </Link>
              <button
                type="button"
                onClick={switchAccount}
                className="text-[11px] font-semibold text-ink/60 underline underline-offset-2 hover:text-lime-deep"
              >
                Entrar con otra cuenta
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <a href="/auth?mode=login" className="text-sm font-semibold hover:underline underline-offset-4">
                Entrar
              </a>
              <a href="/auth?mode=signup" className="btn-primary !py-2 !px-4 !text-sm">
                Crear cuenta
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink bg-paper"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-ink/10 bg-paper px-5 py-4">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium py-2 hover:text-lime-deep transition-colors"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              {loading ? null : isAuthenticated ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="btn-primary !py-2.5 !text-center !text-sm">
                    Ir a mi panel
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); switchAccount(); }}
                    className="text-sm font-semibold text-ink/60 underline underline-offset-2 hover:text-lime-deep text-center py-2"
                  >
                    Entrar con otra cuenta
                  </button>
                </>
              ) : (
                <>
                  <a href="/auth?mode=login" onClick={() => setOpen(false)} className="text-sm font-semibold text-center py-2 hover:text-lime-deep">
                    Entrar
                  </a>
                  <a href="/auth?mode=signup" onClick={() => setOpen(false)} className="btn-primary !py-2.5 !text-center !text-sm">
                    Crear cuenta
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
