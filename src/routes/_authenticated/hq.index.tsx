import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, Flame, Moon, Phone } from "lucide-react";
import { HqHeader } from "@/components/hq/HqShell";
import { formatDayEs } from "@/components/ui/date-field";
import { friendlyError } from "@/lib/errors";
import { daysFromToday, listClubs, listProspects, listTasks, setTaskDone, stageLabel } from "@/lib/hq";

export const Route = createFileRoute("/_authenticated/hq/")({
  component: HqInicio,
});

function cuando(day: string): { text: string; late: boolean } {
  const d = daysFromToday(day);
  if (d < 0) return { text: `Atrasado ${-d} ${-d === 1 ? "día" : "días"}`, late: true };
  if (d === 0) return { text: "Hoy", late: false };
  if (d === 1) return { text: "Mañana", late: false };
  return { text: formatDayEs(day), late: false };
}

function HqInicio() {
  const prospectsQ = useQuery({ queryKey: ["hq-prospects"], queryFn: listProspects });
  const clubsQ = useQuery({ queryKey: ["hq-clubs"], queryFn: listClubs });
  const tasksQ = useQuery({ queryKey: ["hq-tasks"], queryFn: listTasks });
  const qc = useQueryClient();
  const doneMut = useMutation({
    mutationFn: (id: string) => setTaskDone(id, true),
    onSuccess: () => { toast.success("¡Hecha! ✅"); qc.invalidateQueries({ queryKey: ["hq-tasks"] }); },
    onError: (e) => toast.error(friendlyError(e, "No pudimos marcarla. Vuelve a intentarlo.")),
  });
  const prospects = prospectsQ.data ?? [];
  const clubs = clubsQ.data ?? [];

  const abiertos = prospects.filter((p) => p.stage !== "pagando" && p.stage !== "perdido");
  const paraHoy = abiertos.filter((p) => p.next_date && daysFromToday(p.next_date) <= 1);
  const tareasHoy = (tasksQ.data ?? []).filter((t) => !t.done_at && t.due_date && daysFromToday(t.due_date) <= 0);
  const porVencer = clubs.filter((c) => !c.paid_until && c.trial_days_left > 0 && c.trial_days_left <= 3);
  const dormidos = clubs.filter((c) => c.estado === "dormido");

  const tiles = [
    { label: "Prospectos activos", value: abiertos.length },
    { label: "En prueba", value: prospects.filter((p) => p.stage === "en_prueba").length },
    { label: "Pagando", value: prospects.filter((p) => p.stage === "pagando").length },
    { label: "Clubes registrados", value: clubs.length },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:py-10">
      <HqHeader title="Tu día" subtitle="Lo que tienes que mover hoy en FullTime." />

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border-2 border-ink bg-card p-4">
            <div className="font-display text-3xl font-bold">{prospectsQ.isLoading || clubsQ.isLoading ? "…" : t.value}</div>
            <div className="text-xs font-semibold text-ink/60">{t.label}</div>
          </div>
        ))}
      </div>

      {(prospectsQ.isError || clubsQ.isError || tasksQ.isError) && (
        <p className="mt-6 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          No pudimos cargar todo. Recarga la página.
        </p>
      )}

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold flex items-center gap-2"><CalendarClock size={20} /> Para hoy</h2>
        {tareasHoy.length > 0 && (
          <ul className="mt-3 space-y-2">
            {tareasHoy.map((t) => {
              const c = cuando(t.due_date!);
              return (
                <li key={t.id} className="rounded-2xl border-2 border-ink bg-card p-4 flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${c.late ? "bg-pa-red text-paper" : "bg-lime text-ink"}`}>{c.text}</span>
                  <p className="min-w-0 flex-1 font-semibold">
                    {t.urgent && <Flame size={14} className="inline -mt-0.5 mr-1 text-pa-red" />}
                    {t.title}
                  </p>
                  <button
                    onClick={() => doneMut.mutate(t.id)} disabled={doneMut.isPending}
                    className="rounded-xl border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-lime/30"
                  >
                    ✅ Hecha
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {paraHoy.length === 0 && tareasHoy.length === 0 ? (
          <p className="mt-3 rounded-2xl border-2 border-dashed border-ink/20 bg-paper p-5 text-sm text-ink/60">
            Nada pendiente para hoy. Agrega <Link to="/hq/tareas" className="font-semibold underline">tareas</Link> o agenda el próximo paso de tus prospectos en el <Link to="/hq/crm" className="font-semibold underline">CRM</Link>.
          </p>
        ) : paraHoy.length === 0 ? null : (
          <ul className="mt-3 space-y-2">
            {paraHoy.map((p) => {
              const c = cuando(p.next_date!);
              return (
                <li key={p.id} className="rounded-2xl border-2 border-ink bg-card p-4 flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${c.late ? "bg-pa-red text-paper" : "bg-lime text-ink"}`}>{c.text}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.next_step || "Dar seguimiento"} · {p.name}{p.team ? ` (${p.team})` : ""}</p>
                    <p className="text-xs text-ink/60">{stageLabel(p.stage)}</p>
                  </div>
                  {p.phone && (
                    <a href={`https://wa.me/${p.phone.replace(/\D/g, "").replace(/^(?=\d{8}$)/, "507")}`} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-lime/30">
                      <Phone size={14} /> WhatsApp
                    </a>
                  )}
                  <Link to="/hq/crm" className="text-sm font-semibold underline">Ver en CRM</Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <section>
          <h2 className="font-display text-xl font-bold flex items-center gap-2"><AlertTriangle size={20} /> Pruebas por vencer</h2>
          {porVencer.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">Ninguna prueba vence en los próximos 3 días.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {porVencer.map((c) => (
                <li key={c.club_id} className="rounded-xl border-2 border-ink bg-card px-4 py-3">
                  <p className="font-semibold">{c.club_name}</p>
                  <p className="text-xs text-pa-red font-semibold">Vence en {c.trial_days_left} {c.trial_days_left === 1 ? "día" : "días"}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="font-display text-xl font-bold flex items-center gap-2"><Moon size={20} /> Clubes dormidos</h2>
          {dormidos.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">Todos los clubes tuvieron actividad en las últimas 3 semanas.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {dormidos.map((c) => (
                <li key={c.club_id} className="rounded-xl border-2 border-ink bg-card px-4 py-3">
                  <p className="font-semibold">{c.club_name}</p>
                  <p className="text-xs text-ink/60">Sin convocatorias en 21 días · {c.admin_name ?? "sin admin"}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
