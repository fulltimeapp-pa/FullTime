import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BarChart3, CalendarDays, Dumbbell, Home, Trophy, UserRound, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";

type Item = { title: string; to: string; tipo?: "partido" | "entreno"; icon: LucideIcon };

export const PLAYER_MENU: Item[] = [
  { title: "Inicio", to: "/inicio", icon: Home },
  { title: "Partidos", to: "/mis-convocatorias", tipo: "partido", icon: Trophy },
  { title: "Entrenos", to: "/mis-convocatorias", tipo: "entreno", icon: Dumbbell },
  { title: "Calendario", to: "/mi-calendario", icon: CalendarDays },
  { title: "Mis números", to: "/mis-estadisticas", icon: BarChart3 },
  { title: "Perfil", to: "/mi-perfil", icon: UserRound },
];

/**
 * Marco de las pantallas de la jugadora: arriba el logo y "Cerrar sesión"; el menú va abajo en el
 * celular (como una app) y arriba en la computadora.
 */
export function PlayerShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const loc = useRouterState({ select: (r) => r.location });
  const tipo = (loc.search as { tipo?: string }).tipo;
  const active = (it: Item) => loc.pathname === it.to && (it.tipo ? tipo === it.tipo : !(it.to === "/mis-convocatorias" && tipo));

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-paper/80 border-b border-ink/10">
        <div className="mx-auto max-w-5xl px-5 py-3 flex items-center justify-between">
          <Link to="/inicio" className="flex items-center gap-2">
            <Logo className="h-9 w-9" />
            <span className="font-display text-lg font-bold tracking-tight">
              FullTime<span className="text-pa-red">.</span>
            </span>
          </Link>
          <button onClick={signOut} className="btn-ghost !py-2 !px-4 !text-sm">Cerrar sesión</button>
        </div>
        {/* Computadora: menú arriba */}
        <nav className="hidden md:block border-t border-ink/10">
          <div className="mx-auto max-w-5xl px-5 flex gap-1">
            {PLAYER_MENU.map((it) => (
              <Link key={it.title} to={it.to} search={it.tipo ? { tipo: it.tipo } : {}}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active(it) ? "border-ink text-ink" : "border-transparent text-ink/55 hover:text-ink"
                }`}>
                <it.icon size={16} /> {it.title}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {children}

      {/* Celular: menú abajo */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t-2 border-ink bg-paper/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-6">
          {PLAYER_MENU.map((it) => {
            const on = active(it);
            return (
              <Link key={it.title} to={it.to} search={it.tipo ? { tipo: it.tipo } : {}}
                className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold">
                <span className={`grid h-8 w-10 place-items-center rounded-full ${on ? "bg-lime text-ink" : "text-ink/55"}`}>
                  <it.icon size={19} />
                </span>
                <span className={on ? "text-ink" : "text-ink/55"}>{it.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
