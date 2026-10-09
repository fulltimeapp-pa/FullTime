import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Building2, CheckSquare, CreditCard, Moon, Sparkles } from "lucide-react";
import { HqHeader } from "@/components/hq/HqShell";
import { formatDayEs } from "@/components/ui/date-field";
import { useHqAvisos, type AvisoKind } from "@/lib/hq-avisos";

export const Route = createFileRoute("/_authenticated/hq/notificaciones")({
  component: HqNotificaciones,
});

const ICON: Record<AvisoKind, typeof Building2> = {
  registro: Sparkles,
  prueba: AlertTriangle,
  pago: CreditCard,
  dormido: Moon,
  pendiente: CheckSquare,
};

function HqNotificaciones() {
  const { items, isNew, unseen, markAllSeen, isLoading, isError } = useHqAvisos();

  // Al salir de la pantalla, lo que viste deja de contar como nuevo.
  const markRef = useRef(markAllSeen);
  markRef.current = markAllSeen;
  useEffect(() => () => markRef.current(), []);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:py-10">
      <HqHeader
        title="Notificaciones"
        subtitle="Clubes nuevos, pruebas y pagos por vencer, clubes dormidos y pendientes atrasados."
        action={
          unseen > 0 ? (
            <button onClick={markAllSeen} className="btn-ghost !py-2.5">Marcar todo como visto</button>
          ) : undefined
        }
      />

      {isError && (
        <p className="mt-6 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          No pudimos cargar todo. Recarga la página.
        </p>
      )}

      {isLoading ? (
        <p className="mt-6 text-sm text-ink/50">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-ink/20 bg-paper p-6 text-center text-sm text-ink/60">
          Todo en orden. No hay nada que atender. ✨
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((a) => {
            const Icon = ICON[a.kind];
            const nuevo = isNew(a);
            return (
              <li key={a.key}>
                <Link
                  to={a.to}
                  className={`flex items-start gap-3 rounded-2xl border-2 p-4 transition-shadow hover:shadow-[4px_4px_0_0_var(--color-ink)] ${
                    nuevo ? "border-ink bg-card" : "border-ink/15 bg-paper"
                  }`}
                >
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${a.urgent ? "bg-pa-red/15 text-pa-red" : "bg-lime/50"}`}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{a.title}</p>
                    <p className="mt-0.5 text-sm text-ink/65">{a.detail}</p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink/40">{formatDayEs(a.day)}</p>
                  </div>
                  {nuevo && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-pa-red" aria-label="Nuevo" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
