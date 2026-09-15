import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getMyActiveClub } from "@/lib/active-club";
import { StaffShell } from "@/components/staff/StaffShell";
import { formatShort, kindLabel, type CallUpKind } from "@/lib/call-ups";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "FullTime — Calendario" },
      { name: "description", content: "Partidos y entrenos del club en un solo calendario." },
      { property: "og:title", content: "FullTime — Calendario" },
      { property: "og:description", content: "Partidos y entrenos del club en un solo calendario." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarioPage,
});

type EventRow = {
  id: string;
  kind: CallUpKind;
  starts_at: string;
  place: string;
  objetivo: string | null;
  categories: { name: string } | null;
};

function CalendarioPage() {
  return (
    <StaffShell>
      <Calendario />
    </StaffShell>
  );
}

function Calendario() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });
  const clubId = clubQ.data?.club_id;

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

  const eventsQ = useQuery({
    queryKey: ["calendar-events", clubId, gridStart.toISOString(), gridEnd.toISOString()],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_ups")
        .select("id, kind, starts_at, place, objetivo, categories(name)")
        .eq("club_id", clubId!)
        .gte("starts_at", gridStart.toISOString())
        .lte("starts_at", gridEnd.toISOString())
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as EventRow[];
    },
  });
  const events = eventsQ.data ?? [];

  const byDay = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of events) {
      const key = format(new Date(e.starts_at), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const selectedEvents = selectedDay
    ? byDay.get(format(selectedDay, "yyyy-MM-dd")) ?? []
    : [];

  const weekLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-5 py-8 md:py-12">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <span className="chip">
            <span className="h-1.5 w-1.5 rounded-full bg-lime inline-block" />
            Calendario
          </span>
          <h1 className="mt-3 text-display font-display text-3xl md:text-5xl font-bold leading-[0.95]">
            Tu <span className="marker-underline">mes</span>
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            Partidos y entrenos del club en un solo lugar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor((c) => subMonths(c, 1))}
            className="btn-ghost !py-2 !px-3"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="min-w-[10rem] text-center font-display font-bold text-lg capitalize">
            {format(cursor, "LLLL yyyy", { locale: es })}
          </div>
          <button
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="btn-ghost !py-2 !px-3"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => {
              const d = new Date();
              setCursor(startOfMonth(d));
              setSelectedDay(d);
            }}
            className="btn-ghost !py-2 !px-3 !text-sm"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Legend + shortcuts */}
      <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/10 bg-paper px-2.5 py-1 font-mono uppercase tracking-wider text-ink/60">
          <span className="h-2 w-2 rounded-full bg-pa-red" /> Partido
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/10 bg-paper px-2.5 py-1 font-mono uppercase tracking-wider text-ink/60">
          <span className="h-2 w-2 rounded-full bg-lime" /> Entreno
        </span>
        <div className="ml-auto flex gap-2">
          <Link to="/call-ups/new" className="btn-primary !py-1.5 !px-3 !text-xs">
            <Plus size={14} /> Partido
          </Link>
          <Link to="/entrenos/new" className="btn-primary !py-1.5 !px-3 !text-xs">
            <Plus size={14} /> Entreno
          </Link>
        </div>
      </div>

      {/* Month grid */}
      <div className="mt-5 rounded-2xl border-2 border-ink bg-card overflow-hidden">
        <div className="grid grid-cols-7 border-b-2 border-ink/10 bg-paper/60 text-[10px] sm:text-xs font-mono uppercase tracking-wider text-ink/50">
          {weekLabels.map((w) => (
            <div key={w} className="px-2 py-2 text-center">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = byDay.get(key) ?? [];
            const inMonth = isSameMonth(day, cursor);
            const today = isToday(day);
            const selected = selectedDay && isSameDay(day, selectedDay);
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(day)}
                className={[
                  "min-h-[64px] sm:min-h-[96px] border-b border-r border-ink/10 p-1 sm:p-2 text-left align-top transition-colors",
                  inMonth ? "bg-paper" : "bg-paper/40 text-ink/30",
                  selected ? "ring-2 ring-inset ring-ink" : "",
                  "hover:bg-lime/10",
                ].join(" ")}
              >
                <div
                  className={[
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    today ? "bg-ink text-lime" : "text-ink/70",
                  ].join(" ")}
                >
                  {format(day, "d")}
                </div>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        navigate({ to: "/call-ups/$id", params: { id: e.id } });
                      }}
                      className={[
                        "w-full text-left truncate rounded px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold",
                        e.kind === "partido"
                          ? "bg-pa-red text-paper"
                          : "bg-lime text-ink",
                      ].join(" ")}
                      title={`${kindLabel(e.kind)} — ${e.place}`}
                    >
                      <span className="hidden sm:inline">
                        {format(new Date(e.starts_at), "HH:mm")} · {e.categories?.name ?? kindLabel(e.kind)}
                      </span>
                      <span className="sm:hidden">•</span>
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-ink/50">+{dayEvents.length - 3} más</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day list */}
      {selectedDay && (
        <section className="mt-8">
          <h2 className="font-display text-xl md:text-2xl font-bold capitalize">
            {format(selectedDay, "EEEE d 'de' LLLL", { locale: es })}
          </h2>
          {selectedEvents.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">Sin eventos ese día.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {selectedEvents.map((e) => (
                <button
                  key={e.id}
                  onClick={() => navigate({ to: "/call-ups/$id", params: { id: e.id } })}
                  className="w-full text-left block rounded-2xl border-2 border-ink bg-card p-4 hover:shadow-[6px_6px_0_0_var(--color-lime)] transition-all"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide",
                        e.kind === "partido" ? "bg-pa-red text-paper" : "bg-lime text-ink",
                      ].join(" ")}
                    >
                      {kindLabel(e.kind)}
                    </span>
                    <span className="text-xs font-mono uppercase tracking-wider text-ink/50">
                      {e.categories?.name}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-display text-lg font-bold">{formatShort(e.starts_at)}</h3>
                  <p className="mt-0.5 text-sm text-ink/60 flex items-center gap-1.5">
                    <MapPin size={14} /> {e.place}
                  </p>
                  {e.objetivo && (
                    <p className="mt-1 text-sm text-ink/70 italic line-clamp-1">Objetivo: {e.objetivo}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
