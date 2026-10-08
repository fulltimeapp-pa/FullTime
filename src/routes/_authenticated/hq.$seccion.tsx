import { createFileRoute, Link } from "@tanstack/react-router";
import { HQ_MENU } from "@/lib/hq";
import { HqHeader } from "@/components/hq/HqShell";

export const Route = createFileRoute("/_authenticated/hq/$seccion")({
  component: Proximamente,
});

function Proximamente() {
  const { seccion } = Route.useParams();
  const item = HQ_MENU.flatMap((g) => g.items).find((it) => it.to === `/hq/${seccion}`);
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <HqHeader title={item?.title ?? "Sección"} />
      <div className="mt-8 rounded-2xl border-2 border-dashed border-ink/30 bg-paper p-8 text-center">
        <p className="font-display text-2xl font-bold">Próximamente</p>
        <p className="mt-2 text-ink/60">Esta sección de FullTime HQ todavía no está lista.</p>
        <Link to="/hq" className="btn-primary mt-5 inline-flex">Volver al inicio</Link>
      </div>
    </div>
  );
}
