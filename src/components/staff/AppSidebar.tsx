import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Users, Trophy, Dumbbell, Calendar, User, LogOut, Shield, BarChart3 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { getMyActiveClub } from "@/lib/active-club";
import { Logo } from "@/components/brand/Logo";
import { ClubCrest } from "@/components/brand/ClubCrest";


const items = [
  { title: "Inicio", url: "/dashboard", icon: Home },
  { title: "Plantel", url: "/roster", icon: Users },
  { title: "Equipo", url: "/equipo", icon: Shield },
  { title: "Partidos", url: "/call-ups", icon: Trophy },
  { title: "Entrenos", url: "/entrenos", icon: Dumbbell },
  { title: "Calendario", url: "/calendario", icon: Calendar },
  { title: "Asistencia", url: "/asistencia", icon: BarChart3 },

  { title: "Perfil", url: "/perfil-entrenador", icon: User },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });
  const clubName = clubQ.data?.club?.name ?? "";

  const isActive = (url: string) =>
    url === "/dashboard" ? pathname === "/dashboard" : pathname === url || pathname.startsWith(url + "/");

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  return (
    <Sidebar collapsible="icon" className="border-r-2 border-ink/10">
      <SidebarHeader className="border-b border-ink/10">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <Logo className="h-9 w-9" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-display text-base font-bold tracking-tight leading-none">
                FullTime<span className="text-pa-red">.</span>
              </div>
              {clubName && (
                <div className="mt-1 flex items-center gap-1.5 min-w-0">
                  <ClubCrest
                    logoPath={clubQ.data?.club?.logo_path}
                    name={clubName}
                    className="h-4 w-4 text-[9px]"
                  />
                  <span className="truncate text-[11px] font-mono uppercase tracking-wider text-ink/50">
                    {clubName}
                  </span>
                </div>
              )}

            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Navegación</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={
                        active
                          ? "!bg-lime !text-ink font-semibold hover:!bg-lime"
                          : "hover:bg-ink/5"
                      }
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-ink/10">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Cerrar sesión"
              onClick={signOut}
              className="hover:bg-pa-red/10 hover:text-pa-red"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
