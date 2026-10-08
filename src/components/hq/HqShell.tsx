import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { HQ_MENU, type HqItem } from "@/lib/hq";

/** Marco de FullTime HQ: menú lateral y acceso solo para la dueña de la plataforma. */
export function HqShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const gate = useQuery({
    queryKey: ["is-platform-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_platform_admin");
      if (error) throw error;
      return data === true;
    },
  });

  useEffect(() => {
    if (gate.isSuccess && gate.data === false) navigate({ to: "/dashboard", replace: true });
  }, [gate.isSuccess, gate.data, navigate]);

  if (gate.isLoading) return <div className="min-h-screen bg-background p-10 text-ink/50">Cargando…</div>;
  if (gate.isError)
    return (
      <div className="min-h-screen bg-background p-10">
        <p className="text-pa-red font-semibold">No pudimos comprobar tu acceso. Recarga la página.</p>
      </div>
    );
  if (!gate.data) return null;

  const isActive = (it: HqItem) => (it.to === "/hq" ? pathname === "/hq" || pathname === "/hq/" : pathname.startsWith(it.to));

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      {/* Menú lateral (computadora) */}
      <aside className="hidden md:flex md:w-64 shrink-0 flex-col bg-ink text-paper min-h-screen sticky top-0 max-h-screen overflow-y-auto">
        <div className="flex items-center gap-2 px-5 py-5">
          <Logo className="h-8 w-8" />
          <span className="font-display text-lg font-bold">FullTime <span className="text-lime">HQ</span></span>
        </div>
        <nav className="flex-1 px-3 pb-6">
          {HQ_MENU.map((g) => (
            <div key={g.group} className="mt-4">
              <p className="px-3 text-[11px] font-mono uppercase tracking-widest text-paper/40">{g.group}</p>
              <ul className="mt-1 space-y-0.5">
                {g.items.map((it) => (
                  <li key={it.title}>
                    <Link
                      to={it.to}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                        isActive(it) ? "bg-paper/15 text-paper" : "text-paper/80 hover:bg-paper/10"
                      }`}
                    >
                      <it.icon size={18} className={isActive(it) ? "text-lime" : ""} />
                      <span className="flex-1">{it.title}</span>
                      {!it.ready && <span className="text-[10px] font-mono text-paper/35">pronto</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <Link to="/dashboard" className="mx-3 mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-paper/70 hover:bg-paper/10">
          <ArrowLeft size={16} /> Volver a mi club
        </Link>
      </aside>

      {/* Menú superior (celular) */}
      <div className="md:hidden sticky top-0 z-40 bg-ink text-paper">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-display font-bold">FullTime <span className="text-lime">HQ</span></span>
          <Link to="/dashboard" className="text-xs text-paper/70">Volver a mi club</Link>
        </div>
        <nav className="flex gap-1.5 overflow-x-auto px-3 pb-3">
          {HQ_MENU.flatMap((g) => g.items).filter((it) => it.ready).map((it) => (
            <Link
              key={it.title}
              to={it.to}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${isActive(it) ? "bg-lime text-ink" : "bg-paper/10 text-paper"}`}
            >
              {it.title}
            </Link>
          ))}
        </nav>
      </div>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

export function HqHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-ink/60">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
