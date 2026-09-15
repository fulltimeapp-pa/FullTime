import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { CuentaSuspendida } from "@/components/staff/CuentaSuspendida";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { getMyActiveClub, isStaffRole } from "@/lib/active-club";

function AuthenticatedLayout() {
  const location = useLocation();
  const adminQ = usePlatformAdmin();
  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });
  const clubId = clubQ.data?.club_id;

  const subQ = useQuery({
    queryKey: ["club-subscription", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_subscription")
        .select("paid_until, blocked")
        .eq("club_id", clubId!)
        .maybeSingle();
      if (error) throw error;
      return data as { paid_until: string | null; blocked: boolean } | null;
    },
  });

  const isPanel = location.pathname.startsWith("/panel-fulltime");
  // Solo bloquea con blocked === true explícito; nunca a la dueña ni en su panel.
  const blocked =
    subQ.data?.blocked === true && adminQ.data !== true && !isPanel;

  if (blocked) return <CuentaSuspendida isStaff={isStaffRole(clubQ.data?.role)} />;

  return (
    <>
      <Outlet />
      <InstallPrompt />
    </>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { mode: "login" } });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});
