import { createFileRoute, Outlet } from "@tanstack/react-router";
import { HqShell } from "@/components/hq/HqShell";

export const Route = createFileRoute("/_authenticated/hq")({
  head: () => ({ meta: [{ title: "FullTime HQ" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <HqShell>
      <Outlet />
    </HqShell>
  ),
});
