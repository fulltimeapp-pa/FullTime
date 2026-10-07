import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, BookOpen, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StaffShell } from "@/components/staff/StaffShell";
import { getMyActiveClub } from "@/lib/active-club";
import { PlanEditor } from "@/components/training/PlanEditor";
import { newLocalId, type PlanActivity, type PlanPart, type Intensity } from "@/lib/training-plan";
import { sendPush, sendPushBulk } from "@/lib/push.functions";
import { addMinutesToTime, toStartEnd } from "@/lib/call-ups";
import { WEEKDAYS, buildRepeatDates, endOfMonth, shortDayLabel, MAX_REPEAT, type Weekday } from "@/lib/repetir";

export const Route = createFileRoute("/_authenticated/entrenos/new")({
  // ?repetir=1 abre directo en "Varios días" (desde el recordatorio del panel).
  validateSearch: (s: Record<string, unknown>): { repetir?: boolean } => ({
    repetir: s.repetir === 1 || s.repetir === "1" || s.repetir === true ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "FullTime — Nuevo entreno" },
      { name: "description", content: "Crea una sesión de entrenamiento para tu equipo." },
      { property: "og:title", content: "FullTime — Nuevo entreno" },
      { property: "og:description", content: "Crea una sesión de entrenamiento para tu equipo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <StaffShell>
      <NewEntreno />
    </StaffShell>
  ),
});

type Cat = { id: string; name: string };
type PL = { id: string; full_name: string; jersey_number: number | null };
type Template = { id: string; name: string };

function Toggle({ on, onChange, title, desc }: {
  on: boolean; onChange: (v: boolean) => void; title: string; desc: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`w-full flex items-start gap-3 rounded-xl border-2 border-ink px-4 py-3 text-left transition-all ${on ? "bg-lime/25" : "bg-card hover:bg-cream"}`}
    >
      <span className={`mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-ink p-0.5 transition-colors ${on ? "bg-lime" : "bg-paper"}`}>
        <span className={`h-4 w-4 rounded-full bg-ink transition-transform ${on ? "translate-x-5" : ""}`} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-ink/60">{desc}</span>
      </span>
    </button>
  );
}


function todayLocalDate() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function NewEntreno() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });
  const clubId = clubQ.data?.club_id;

  const catsQ = useQuery({
    queryKey: ["categories", clubId],
    enabled: !!clubId,
    queryFn: async (): Promise<Cat[]> => {
      const { data, error } = await supabase
        .from("categories").select("id, name")
        .eq("club_id", clubId!).order("created_at");
      if (error) throw error;
      return (data ?? []) as Cat[];
    },
  });

  const [categoryId, setCategoryId] = useState("");
  useEffect(() => {
    if (!categoryId && catsQ.data?.length) setCategoryId(catsQ.data[0].id);
  }, [catsQ.data, categoryId]);

  const { repetir } = Route.useSearch();
  const [date, setDate] = useState(todayLocalDate());
  const [time, setTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:30");
  // Varios días: cada día de la semana elegido con su hora.
  const [mode, setMode] = useState<"uno" | "varios">(repetir ? "varios" : "uno");
  const [repeatDays, setRepeatDays] = useState<Map<Weekday, { start: string; end: string }>>(new Map());
  const [until, setUntil] = useState(endOfMonth(todayLocalDate()));
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const repeatAll = useMemo(
    () =>
      buildRepeatDates(
        date,
        until,
        Array.from(repeatDays, ([weekday, t]) => ({ weekday, time: t.start })),
      ),
    [date, until, repeatDays],
  );
  const repeatDates = repeatAll.filter((d) => !skipped.has(d.date));

  function toggleWeekday(wd: Weekday) {
    setRepeatDays((prev) => {
      const n = new Map(prev);
      if (n.has(wd)) n.delete(wd); else n.set(wd, { start: time, end: endTime });
      return n;
    });
  }
  function toggleSkipped(day: string) {
    setSkipped((prev) => {
      const n = new Set(prev);
      if (n.has(day)) n.delete(day); else n.add(day);
      return n;
    });
  }
  const [place, setPlace] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [activities, setActivities] = useState<PlanActivity[]>([]);
  const [wellnessEnabled, setWellnessEnabled] = useState(false);
  const [rpeEnabled, setRpeEnabled] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [showSave, setShowSave] = useState(false);


  const playersQ = useQuery({
    queryKey: ["players-of-cat", categoryId],
    enabled: !!categoryId,
    queryFn: async (): Promise<PL[]> => {
      const { data, error } = await supabase
        .from("players").select("id, full_name, jersey_number")
        .eq("category_id", categoryId).order("full_name");
      if (error) throw error;
      return (data ?? []) as PL[];
    },
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (playersQ.data) setSelected(new Set(playersQ.data.map((p) => p.id)));
  }, [playersQ.data]);

  const players = playersQ.data ?? [];
  const allSelected = players.length > 0 && selected.size === players.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const templatesQ = useQuery({
    queryKey: ["session-templates", clubId],
    enabled: !!clubId,
    queryFn: async (): Promise<Template[]> => {
      const { data, error } = await supabase
        .from("session_templates").select("id, name")
        .eq("club_id", clubId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const loadTemplateMut = useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await supabase
        .from("session_template_activities")
        .select("part, name, duration_min, intensity, note, sort_order")
        .eq("template_id", templateId)
        .order("part").order("sort_order");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: newLocalId(),
        part: r.part as PlanPart,
        name: r.name,
        duration_min: r.duration_min,
        intensity: r.intensity as Intensity | null,
        note: r.note,
      })) as PlanActivity[];
    },
    onSuccess: (acts) => {
      setActivities(acts);
      setShowLoad(false);
    },
    onError: (e: any) => setError(e?.message || "No pudimos cargar la plantilla."),
  });

  const saveTemplateMut = useMutation({
    mutationFn: async (name: string) => {
      if (!clubId) throw new Error("Sin club activo.");
      if (!name.trim()) throw new Error("Ponle un nombre a la plantilla.");
      if (activities.length === 0) throw new Error("Agrega al menos una actividad.");
      const { data: t, error: tErr } = await supabase
        .from("session_templates")
        .insert({ club_id: clubId, name: name.trim(), created_by: user.id })
        .select("id").single();
      if (tErr) throw tErr;
      const rows = activities.map((a, i) => ({
        template_id: t.id,
        part: a.part,
        name: a.name.trim(),
        duration_min: a.duration_min,
        intensity: a.intensity,
        note: a.note,
        sort_order: i,
      }));
      const { error: aErr } = await supabase.from("session_template_activities").insert(rows);
      if (aErr) throw aErr;
      return t.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session-templates", clubId] });
      setShowSave(false);
    },
    onError: (e: any) => setError(e?.message || "No pudimos guardar la plantilla."),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!clubId) throw new Error("Sin club activo.");
      if (!categoryId) throw new Error("Elige un equipo.");
      
      if (selected.size === 0) throw new Error("Selecciona al menos una jugadora.");
      const cleanActs = activities.filter((a) => a.name.trim().length > 0);

      if (mode === "varios") {
        if (repeatDays.size === 0) throw new Error("Elige al menos un día de la semana.");
        if (repeatDates.length === 0) throw new Error("No hay fechas en ese rango. Revisa desde y hasta.");

        const base = {
          club_id: clubId, category_id: categoryId,
          kind: "entreno" as const, place: place.trim(),
          objetivo: objetivo.trim() || null,
          wellness_enabled: wellnessEnabled,
          rpe_enabled: rpeEnabled,
          note: note.trim() || null, created_by: user.id,
        };
        const { data: cus, error: mErr } = await supabase
          .from("call_ups")
          .insert(repeatDates.map((d) => ({
            ...base,
            ...toStartEnd(d.date, d.time, repeatDays.get(d.weekday)?.end ?? ""),
          })))
          .select("id");
        if (mErr) throw mErr;
        const ids = (cus ?? []).map((c) => c.id as string);

        const playerRows = ids.flatMap((cid) =>
          Array.from(selected).map((pid) => ({ call_up_id: cid, player_id: pid })),
        );
        const { error: pErr } = await supabase.from("call_up_players").insert(playerRows);
        if (pErr) throw new Error("Creamos los entrenos, pero no pudimos convocar a las jugadoras. Revísalos en la lista.");

        if (cleanActs.length > 0) {
          const actRows = ids.flatMap((cid) =>
            cleanActs.map((a, i) => ({
              call_up_id: cid, part: a.part, name: a.name.trim(),
              duration_min: a.duration_min, intensity: a.intensity, note: a.note, sort_order: i,
            })),
          );
          const { error: aErr } = await supabase.from("training_activities").insert(actRows);
          if (aErr) throw new Error("Creamos los entrenos, pero no pudimos guardar el plan. Revísalos en la lista.");
        }

        // Un solo aviso de resumen para todas las jugadoras.
        try {
          await sendPushBulk({ data: { call_up_ids: ids } });
        } catch (e) {
          console.warn("No se pudo enviar el aviso de resumen", e);
          toast.error("Creamos los entrenos, pero no pudimos avisar a las jugadoras.");
        }
        return { many: ids.length };
      }

      const { starts_at: startsAt, ends_at: endsAt } = toStartEnd(date, time, endTime);

      const { data: cu, error: cErr } = await supabase
        .from("call_ups")
        .insert({
          club_id: clubId, category_id: categoryId,
          kind: "entreno", starts_at: startsAt, ends_at: endsAt, place: place.trim(),
          objetivo: objetivo.trim() || null,
          wellness_enabled: wellnessEnabled,
          rpe_enabled: rpeEnabled,
          note: note.trim() || null, created_by: user.id,
        })
        .select("id").single();

      if (cErr) throw cErr;

      const rows = Array.from(selected).map((pid) => ({
        call_up_id: cu.id, player_id: pid,
      }));
      const { error: pErr } = await supabase.from("call_up_players").insert(rows);
      if (pErr) throw pErr;

      if (cleanActs.length > 0) {
        const actRows = cleanActs.map((a, i) => ({
          call_up_id: cu.id,
          part: a.part,
          name: a.name.trim(),
          duration_min: a.duration_min,
          intensity: a.intensity,
          note: a.note,
          sort_order: i,
        }));
        const { error: aErr } = await supabase.from("training_activities").insert(actRows);
        if (aErr) throw aErr;
      }

      // Aviso push: complementario, nunca bloquea la creación.
      void sendPush({ data: { call_up_id: cu.id as string } }).catch((e) =>
        console.warn("No se pudo enviar el push", e),
      );
      return { id: cu.id as string };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["entrenos"] });
      if ("many" in r) {
        toast.success(`Listo: creamos ${r.many} entrenos.`);
        navigate({ to: "/entrenos" });
      } else {
        navigate({ to: "/call-ups/$id", params: { id: r.id } });
      }
    },
    onError: (e: any) => setError(e?.message || "No pudimos crear el entreno."),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-paper/70 border-b border-ink/10">
        <div className="mx-auto max-w-3xl px-5 py-3.5 flex items-center">
          <Link to="/entrenos" className="flex items-center gap-2 text-sm font-semibold hover:opacity-70">
            <ArrowLeft size={16} /> Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-display text-4xl md:text-5xl font-bold leading-[0.95]">
          Nuevo <span className="marker-underline">entreno</span>
        </h1>

        <form
          onSubmit={(e) => { e.preventDefault(); setError(""); createMut.mutate(); }}
          className="mt-8 space-y-6"
        >
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Equipo</label>
            <select
              value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 font-semibold"
            >
              {(catsQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-ink/50">¿Cuándo?</label>
            <div className="mt-1.5 grid grid-cols-2 rounded-xl border-2 border-ink overflow-hidden" role="group">
              {(["uno", "varios"] as const).map((m) => (
                <button
                  key={m} type="button" aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={`py-3 font-semibold ${mode === m ? "bg-ink text-lime" : "bg-paper hover:bg-cream"}`}
                >
                  {m === "uno" ? "Un día" : "Varios días"}
                </button>
              ))}
            </div>
          </div>

          {mode === "uno" ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Fecha</label>
                <input
                  type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Empieza</label>
                  <input
                    type="time" required value={time}
                    onChange={(e) => {
                      const t = e.target.value;
                      if (!endTime || endTime === addMinutesToTime(time, 90)) setEndTime(addMinutesToTime(t, 90));
                      setTime(t);
                    }}
                    className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Termina</label>
                  <input
                    type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 font-semibold"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5 rounded-2xl border-2 border-ink bg-card p-4">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Días que entrenan</label>
                <div className="mt-2 grid grid-cols-7 gap-1.5">
                  {WEEKDAYS.map((w) => {
                    const on = repeatDays.has(w.value);
                    return (
                      <button
                        key={w.value} type="button" aria-pressed={on}
                        onClick={() => toggleWeekday(w.value)}
                        className={`rounded-lg border-2 py-2.5 text-sm font-bold ${on ? "bg-lime border-ink" : "border-ink/30 bg-paper"}`}
                      >
                        {w.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {repeatDays.size > 0 && (
                <div className="space-y-2">
                  {WEEKDAYS.filter((w) => repeatDays.has(w.value)).map((w) => (
                    <div key={w.value} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold w-24">{w.long}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="time" required value={repeatDays.get(w.value)?.start ?? ""}
                          aria-label={`Empieza el ${w.long}`}
                          onChange={(e) => {
                            const start = e.target.value;
                            setRepeatDays((prev) => {
                              const cur = prev.get(w.value) ?? { start: "", end: "" };
                              const end = !cur.end || cur.end === addMinutesToTime(cur.start, 90)
                                ? addMinutesToTime(start, 90) : cur.end;
                              return new Map(prev).set(w.value, { start, end });
                            });
                          }}
                          className="w-32 rounded-xl border-2 border-ink bg-paper px-3 py-2.5 font-semibold"
                        />
                        <span className="text-ink/50">a</span>
                        <input
                          type="time" value={repeatDays.get(w.value)?.end ?? ""}
                          aria-label={`Termina el ${w.long}`}
                          onChange={(e) =>
                            setRepeatDays((prev) => {
                              const cur = prev.get(w.value) ?? { start: time, end: "" };
                              return new Map(prev).set(w.value, { ...cur, end: e.target.value });
                            })
                          }
                          className="w-32 rounded-xl border-2 border-ink bg-paper px-3 py-2.5 font-semibold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Desde</label>
                  <input
                    type="date" required value={date}
                    onChange={(e) => { setDate(e.target.value); setUntil(endOfMonth(e.target.value)); }}
                    className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Hasta</label>
                  <input
                    type="date" required value={until} min={date} onChange={(e) => setUntil(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 font-semibold"
                  />
                </div>
              </div>

              {repeatAll.length > 0 && (
                <div>
                  <p className="font-semibold">
                    Se crearán {repeatDates.length} entrenos
                  </p>
                  <p className="text-xs text-ink/50">Toca una fecha para quitarla (por ejemplo, un feriado).</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {repeatAll.map((d) => {
                      const off = skipped.has(d.date);
                      return (
                        <button
                          key={d.date} type="button" onClick={() => toggleSkipped(d.date)}
                          aria-pressed={!off}
                          className={`rounded-full border-2 px-3 py-1.5 text-xs font-semibold ${off ? "border-ink/20 text-ink/40 line-through bg-paper" : "border-ink bg-lime/30"}`}
                        >
                          {shortDayLabel(d.date)} · {d.time}{repeatDays.get(d.weekday)?.end ? `–${repeatDays.get(d.weekday)!.end}` : ""}
                        </button>
                      );
                    })}
                  </div>
                  {repeatAll.length >= MAX_REPEAT && (
                    <p className="mt-2 text-xs text-pa-red">Máximo {MAX_REPEAT} entrenos de una vez. Acorta el rango.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Lugar (opcional)</label>
            <input
              type="text" value={place} onChange={(e) => setPlace(e.target.value)}
              placeholder="Cancha del Maracaná, Panamá"
              className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Objetivo del entreno</label>
            <input
              type="text" value={objetivo} onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Trabajo de definición y salida de balón"
              className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3"
            />
            <p className="mt-1 text-xs text-ink/50">Cuéntale al equipo en qué se van a enfocar hoy.</p>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Nota (opcional)</label>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="Llegar 15 minutos antes. Traer botines y agua."
              className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 resize-none"
            />
          </div>

          {/* Plan del entreno */}
          <div className="pt-4 border-t-2 border-ink/10">
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => setShowLoad(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-paper px-3 py-2 text-xs font-semibold hover:bg-lime/20"
              >
                <BookOpen size={14} /> Cargar plantilla
              </button>
              <button
                type="button"
                onClick={() => setShowSave(true)}
                disabled={activities.filter((a) => a.name.trim()).length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-paper px-3 py-2 text-xs font-semibold hover:bg-lime/20 disabled:opacity-40"
              >
                <Save size={14} /> Guardar como plantilla
              </button>
            </div>

            <PlanEditor activities={activities} onChange={setActivities} />
          </div>

          {/* Seguimiento de la jugadora */}
          <div className="pt-4 border-t-2 border-ink/10">
            <h3 className="font-display text-lg font-bold">Seguimiento de la jugadora (opcional)</h3>
            <p className="mt-1 text-sm text-ink/50">Actívalo solo si quieres pedirle esto al equipo en este entreno.</p>
            <div className="mt-3 space-y-2">
              <Toggle
                on={wellnessEnabled} onChange={setWellnessEnabled}
                title="Pedir wellness antes del entreno"
                desc="Cómo llega la jugadora: sueño, energía, ánimo y molestias."
              />
              <Toggle
                on={rpeEnabled} onChange={setRpeEnabled}
                title="Pedir RPE después del entreno"
                desc="Qué tan exigente sintió el entreno (escala 1 a 10)."
              />
            </div>
          </div>



          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-ink/50">
                Convocar ({selected.size} de {players.length})
              </label>
              <button
                type="button"
                onClick={() => setSelected(allSelected ? new Set() : new Set(players.map((p) => p.id)))}
                className="text-xs font-semibold underline"
              >
                {allSelected ? "Deseleccionar todas" : "Seleccionar todas"}
              </button>
            </div>
            <div className="mt-2 rounded-xl border-2 border-ink bg-card divide-y divide-ink/10 max-h-72 overflow-auto">
              {playersQ.isLoading ? (
                <p className="p-4 text-sm text-ink/50">Cargando plantel...</p>
              ) : players.length === 0 ? (
                <p className="p-4 text-sm text-ink/50">
                  Este equipo aún no tiene jugadoras. <Link to="/roster" className="underline font-semibold">Ve al plantel</Link>.
                </p>
              ) : (
                players.map((p) => {
                  const on = selected.has(p.id);
                  return (
                    <button
                      key={p.id} type="button"
                      onClick={() => toggle(p.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left ${on ? "bg-lime/20" : "hover:bg-cream"}`}
                    >
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md border-2 ${on ? "bg-ink border-ink text-lime" : "border-ink/30 bg-paper"}`}>
                        {on && <Check size={14} strokeWidth={3} />}
                      </span>
                      <span className="font-semibold flex-1">{p.full_name}</span>
                      {p.jersey_number != null && (
                        <span className="font-mono text-xs text-ink/50">#{p.jersey_number}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={createMut.isPending} className="btn-primary">
              {createMut.isPending
                ? "Creando..."
                : mode === "varios"
                  ? `Crear ${repeatDates.length} entrenos`
                  : "Crear entreno"}
            </button>
            <Link to="/entrenos" className="btn-ghost">Cancelar</Link>
          </div>
        </form>
      </main>

      {showLoad && (
        <LoadTemplateModal
          templates={templatesQ.data ?? []}
          loading={templatesQ.isLoading}
          hasActivities={activities.length > 0}
          onClose={() => setShowLoad(false)}
          onPick={(id) => loadTemplateMut.mutate(id)}
          picking={loadTemplateMut.isPending}
        />
      )}
      {showSave && (
        <SaveTemplateModal
          onClose={() => setShowSave(false)}
          onSave={(name) => saveTemplateMut.mutate(name)}
          saving={saveTemplateMut.isPending}
        />
      )}
    </div>
  );
}

function LoadTemplateModal({
  templates, loading, hasActivities, onClose, onPick, picking,
}: {
  templates: Template[]; loading: boolean; hasActivities: boolean;
  onClose: () => void; onPick: (id: string) => void; picking: boolean;
}) {
  function handlePick(id: string) {
    if (hasActivities && !confirm("Ya tienes actividades. ¿Reemplazar el plan con la plantilla?")) return;
    onPick(id);
  }
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-bold">Cargar plantilla</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        {loading ? (
          <p className="text-sm text-ink/50">Cargando...</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-ink/50">Aún no tienes plantillas. Guarda una desde el plan actual.</p>
        ) : (
          <ul className="divide-y divide-ink/10 max-h-80 overflow-auto">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={picking}
                  onClick={() => handlePick(t.id)}
                  className="w-full text-left px-3 py-3 font-semibold hover:bg-lime/20 rounded-lg disabled:opacity-50"
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SaveTemplateModal({
  onClose, onSave, saving,
}: {
  onClose: () => void; onSave: (name: string) => void; saving: boolean;
}) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-bold">Guardar como plantilla</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Nombre</label>
        <input
          autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Definición · Recuperación · Físico..."
          className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 font-semibold"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button" disabled={saving || !name.trim()}
            onClick={() => onSave(name)}
            className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar plantilla"}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost !py-2 !px-4 !text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
