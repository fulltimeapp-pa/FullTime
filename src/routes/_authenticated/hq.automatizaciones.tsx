import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CircleDollarSign, MessageCircle, RefreshCw, UserCheck } from "lucide-react";
import { HqHeader } from "@/components/hq/HqShell";
import { friendlyError } from "@/lib/errors";
import { SEGUIMIENTO_DIAS, correrAutomatizaciones, readLog, type LogItem } from "@/lib/hq-automatizaciones";

export const Route = createFileRoute("/_authenticated/hq/automatizaciones")({
  component: HqAutomatizaciones,
});

const REGLAS = [
  {
    icon: MessageCircle,
    titulo: "Seguimiento automático",
    cuando: `Una conversación del Inbox lleva ${SEGUIMIENTO_DIAS} días o más esperando respuesta.`,
    hace: 'Crea la tarea "Mandar seguimiento a …" para hoy. No la repite: si tocas "Ya le respondí", vuelve a contar desde ese día.',
  },
  {
    icon: UserCheck,
    titulo: "Se registró → En prueba",
    cuando: "Un prospecto del CRM crea su club en FullTime (lo reconoce por el club ligado o porque se registró con el mismo correo).",
    hace: 'Lo pasa a "En prueba" y lo liga a su club.',
  },
  {
    icon: CircleDollarSign,
    titulo: "Pagó → Pagando",
    cuando: "El club de un prospecto tiene el pago al día (registrado en Clientes).",
    hace: 'Lo pasa a "Pagando".',
  },
];

function cuandoFue(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-PA", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Panama" });
}

function HqAutomatizaciones() {
  const qc = useQueryClient();
  const [log, setLog] = useState<LogItem[]>([]);
  useEffect(() => setLog(readLog()), []);

  const runMut = useMutation({
    mutationFn: () => correrAutomatizaciones(qc, true),
    onSuccess: () => setLog(readLog()),
    onError: (e) => toast.error(friendlyError(e, "No pudimos revisar ahora. Vuelve a intentarlo.")),
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:py-10">
      <HqHeader
        title="Automatizaciones"
        subtitle="Corren solas cada vez que abres FullTime HQ. No mandan avisos al celular."
        action={
          <button onClick={() => runMut.mutate()} disabled={runMut.isPending} className="btn-primary !py-2.5">
            <RefreshCw size={16} className={runMut.isPending ? "animate-spin" : ""} /> {runMut.isPending ? "Revisando…" : "Revisar ahora"}
          </button>
        }
      />

      <div className="mt-6 space-y-3">
        {REGLAS.map((r) => (
          <div key={r.titulo} className="flex gap-4 rounded-2xl border-2 border-ink bg-card p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime/60"><r.icon size={20} /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-lg font-bold leading-tight">{r.titulo}</p>
                <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-lime">Activa</span>
              </div>
              <p className="mt-1 text-sm text-ink/70"><b className="text-ink">Cuándo:</b> {r.cuando}</p>
              <p className="mt-0.5 text-sm text-ink/70"><b className="text-ink">Qué hace:</b> {r.hace}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Lo que hicieron</h2>
        <p className="text-xs text-ink/50">Se guarda en este navegador (últimos 30 cambios).</p>
        {log.length === 0 ? (
          <p className="mt-3 rounded-2xl border-2 border-dashed border-ink/20 bg-paper p-5 text-sm text-ink/60">
            Todavía no han hecho nada. Cuando muevan algo, lo vas a ver aquí.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {log.map((l, i) => (
              <li key={`${l.at}-${i}`} className="rounded-xl border-2 border-ink/15 bg-card px-4 py-3 text-sm">
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink/45">{cuandoFue(l.at)}</span>
                <p className="mt-0.5 font-semibold">{l.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
