import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { getMyActiveClub, isStaffRole } from "@/lib/active-club";

/**
 * Envoltorio para todas las pantallas del rol staff (entrenadora/admin/owner).
 * - Provee el sidebar persistente en desktop y un drawer offcanvas en mobile.
 * - Redirige a /inicio si la sesión pertenece a una jugadora (no staff).
 * - No toca el layout interno de la página: cada página sigue controlando su
 *   propio header/hero. En mobile se añade un top bar delgado con hamburguesa.
 */
export function StaffShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });

  const isJugadora =
    clubQ.isSuccess && clubQ.data != null && !isStaffRole(clubQ.data.role);

  useEffect(() => {
    if (isJugadora) navigate({ to: "/inicio", replace: true });
  }, [isJugadora, navigate]);

  if (isJugadora) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top bar solo en mobile con el trigger del sidebar */}
          <div className="md:hidden sticky top-0 z-50 flex items-center gap-2 border-b-2 border-ink/10 bg-paper/90 backdrop-blur px-3 py-2">
            <SidebarTrigger className="text-ink" />
            <span className="font-display text-base font-bold tracking-tight">
              FullTime<span className="text-pa-red">.</span>
            </span>
          </div>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </SidebarProvider>
  );
}
