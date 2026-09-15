import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Calendar, MapPin, Trash2, Check, X, Eye, Clock, Copy, Pencil } from "lucide-react";
import { sendPush } from "@/lib/push.functions";
import { CallUpFields, type CallUpFieldsValue } from "@/components/call-ups/CallUpFields";
import { supabase } from "@/integrations/supabase/client";
import { formatWhen, kindLabel, type CallUp, type CallUpPlayerRow, type ResponseStatus } from "@/lib/call-ups";
import { PlanView } from "@/components/training/PlanView";
import { StaffShell } from "@/components/staff/StaffShell";

import { WellnessForm, RpeForm, WellnessSummary, RpeSummary, type WellnessKey } from "@/components/training/Wellness";
import type { PlanActivity, PlanPart, Intensity } from "@/lib/training-plan";


export const Route = createFileRoute("/_authenticated/call-ups/$id")({
  head: () => ({
    meta: [
      { title: "FullTime — Convocatoria" },
      { name: "description", content: "Detalle de la convocatoria." },
      { property: "og:title", content: "FullTime — Convocatoria" },
      { property: "og:description", content: "Detalle de la convocatoria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CallUpDetail,
});

type Row = CallUpPlayerRow & {
  wellness_sleep: number | null;
  wellness_energy: number | null;
  wellness_mood: number | null;
  wellness_soreness: number | null;
  wellness_at: string | null;
  rpe: number | null;
  rpe_at: string | null;
  player: { id: string; full_name: string; jersey_number: number | null; email: string | null; user_id: string | null };
};

function CallUpDetail() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const cuQ = useQuery({
    queryKey: ["call-up", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_ups")
        .select("id, club_id, category_id, kind, starts_at, place, note, objetivo, wellness_enabled, rpe_enabled, created_by, created_at, categories(name)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No encontramos la convocatoria.");
      return data as CallUp & { wellness_enabled: boolean; rpe_enabled: boolean; categories: { name: string } | null };
    },
  });


  const isAdminQ = useQuery({
    queryKey: ["is-admin", cuQ.data?.club_id, user.id],
    enabled: !!cuQ.data?.club_id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_club_admin", { _user_id: user.id, _club_id: cuQ.data!.club_id });
      if (error) throw error;
      return !!data;
    },
  });

  const rowsQ = useQuery({
    queryKey: ["call-up-rows", id],
    enabled: !!cuQ.data,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("call_up_players")
        .select("id, call_up_id, player_id, status, reason, read_at, responded_at, attended, attended_at, wellness_sleep, wellness_energy, wellness_mood, wellness_soreness, wellness_at, rpe, rpe_at, players(id, full_name, jersey_number, email, user_id)")
        .eq("call_up_id", id);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id, call_up_id: r.call_up_id, player_id: r.player_id,
        status: r.status, reason: r.reason, read_at: r.read_at, responded_at: r.responded_at,
        attended: r.attended, attended_at: r.attended_at,
        wellness_sleep: r.wellness_sleep, wellness_energy: r.wellness_energy,
        wellness_mood: r.wellness_mood, wellness_soreness: r.wellness_soreness,
        wellness_at: r.wellness_at, rpe: r.rpe, rpe_at: r.rpe_at,
        player: r.players,
      }));

    },
  });
  const planQ = useQuery({
    queryKey: ["training-activities", id],
    enabled: !!cuQ.data && cuQ.data.kind === "entreno",
    queryFn: async (): Promise<PlanActivity[]> => {
      const { data, error } = await supabase
        .from("training_activities")
        .select("id, part, name, duration_min, intensity, note, sort_order")
        .eq("call_up_id", id)
        .order("part").order("sort_order");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        part: r.part as PlanPart,
        name: r.name,
        duration_min: r.duration_min,
        intensity: r.intensity as Intensity | null,
        note: r.note,
      }));
    },
  });


  useEffect(() => {
    const ch = supabase
      .channel(`cu-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "call_up_players", filter: `call_up_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["call-up-rows", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  // Identify my row by account link (players.user_id), not email — the login
  // email may differ from the roster email.
  const myRow = useMemo(() => {
    return (rowsQ.data ?? []).find((r) => r.player?.user_id === user.id) || null;
  }, [rowsQ.data, user.id]);

  const isAdmin = !!isAdminQ.data;
  const isPlayer = !!myRow;

  useEffect(() => {
    if (!myRow || myRow.read_at) return;
    supabase.from("call_up_players").update({ read_at: new Date().toISOString() }).eq("id", myRow.id).then();
  }, [myRow]);

  const respondMut = useMutation({
    mutationFn: async ({ status, reason }: { status: ResponseStatus; reason?: string }) => {
      if (!myRow) throw new Error("No estás en esta convocatoria.");
      const { error } = await supabase.from("call_up_players").update({
        status, reason: reason?.trim() || null, responded_at: new Date().toISOString(),
      }).eq("id", myRow.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call-up-rows", id] }),
  });

  const wellnessMut = useMutation({
    mutationFn: async (v: Record<WellnessKey, number>) => {
      if (!myRow) throw new Error("No estás en esta convocatoria.");
      const { error } = await supabase.from("call_up_players").update({
        ...v, wellness_at: new Date().toISOString(),
      }).eq("id", myRow.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call-up-rows", id] }),
  });

  const rpeMut = useMutation({
    mutationFn: async (rpe: number) => {
      if (!myRow) throw new Error("No estás en esta convocatoria.");
      const { error } = await supabase.from("call_up_players").update({
        rpe, rpe_at: new Date().toISOString(),
      }).eq("id", myRow.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call-up-rows", id] }),
  });

  const attendanceMut = useMutation({
    mutationFn: async ({ rowId, attended }: { rowId: string; attended: boolean }) => {
      const { error } = await supabase.from("call_up_players").update({
        attended,
        attended_at: new Date().toISOString(),
      }).eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["call-up-rows", id] });
      toast.success("Asistencia guardada");
    },
    onError: (err) => {
      toast.error("No se pudo guardar la asistencia");
      console.error(err);
    },
  });

  function copyAttendanceList() {
    const rows = rowsQ.data ?? [];
    const going = rows.filter((r) => r.status === "going");
    const attended = going.filter((r) => r.attended);
    const lines = [
      `${kindLabel(cuQ.data!.kind)} · ${formatWhen(cuQ.data!.starts_at)}`,
      `Confirmaron: ${going.length} · Asistieron: ${attended.length}`,
      "",
      "ASISTIERON:",
      ...attended.map((r) => `${r.player.full_name}${r.player.jersey_number ? ` (#${r.player.jersey_number})` : ""}`),
      "",
      "NO ASISTIERON / PENDIENTES:",
      ...going.filter((r) => !r.attended).map((r) => `${r.player.full_name}${r.player.jersey_number ? ` (#${r.player.jersey_number})` : ""}`),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      toast.success("Lista copiada");
    });
  }


  // --- Edición de la convocatoria (sólo cuerpo técnico) ---
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [form, setForm] = useState<CallUpFieldsValue>({
    date: "", time: "", place: "", note: "", objetivo: "",
  });

  function openEdit() {
    const c = cuQ.data;
    if (!c) return;
    const d = new Date(c.starts_at);
    const pad = (n: number) => String(n).padStart(2, "0");
    setForm({
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      place: c.place ?? "",
      note: c.note ?? "",
      objetivo: c.objetivo ?? "",
    });
    setEditError("");
    setEditing(true);
  }

  const editMut = useMutation({
    mutationFn: async () => {
      const c = cuQ.data!;
      if (!form.place.trim()) throw new Error("Indica el lugar.");
      const dt = new Date(`${form.date}T${form.time}:00`);
      if (Number.isNaN(dt.getTime())) throw new Error("Revisa la fecha y la hora.");
      const startsAt = dt.toISOString();
      const horaCambio = startsAt !== new Date(c.starts_at).toISOString();
      const lugarCambio = form.place.trim() !== (c.place ?? "");

      const { error } = await supabase
        .from("call_ups")
        .update({
          starts_at: startsAt,
          place: form.place.trim(),
          note: form.note.trim() || null,
          ...(c.kind === "entreno" ? { objetivo: form.objetivo.trim() || null } : {}),
        })
        .eq("id", id);
      if (error) throw error;

      // Si cambió el horario, los recordatorios automáticos vuelven a salir.
      if (horaCambio) {
        await supabase
          .from("call_up_players")
          .update({ remind_night_before_at: null, remind_soon_at: null })
          .eq("call_up_id", id);
      }
      return { avisar: horaCambio || lugarCambio };
    },
    onSuccess: async ({ avisar }) => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["call-up", id] });
      qc.invalidateQueries({ queryKey: ["call-ups"] });
      qc.invalidateQueries({ queryKey: ["entrenos"] });
      toast.success("Cambio guardado");
      if (!avisar) return;
      try {
        await sendPush({ data: { call_up_id: id, updated: true } });
      } catch (e) {
        console.warn("No se pudo enviar el aviso", e);
        toast.error("Se guardó el cambio, pero no pudimos avisar a las jugadoras.");
      }
    },
    onError: (e: any) => setEditError(e?.message || "No pudimos guardar el cambio. Intenta de nuevo."),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("call_ups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      const dest = cuQ.data?.kind === "entreno" ? "/entrenos" : "/call-ups";
      navigate({ to: dest });
    },
  });

  if (cuQ.isLoading) {
    return <div className="min-h-screen bg-background p-10 text-ink/50">Cargando...</div>;
  }
  if (cuQ.isError || !cuQ.data) {
    return (
      <div className="min-h-screen bg-background p-10">
        <Link to="/call-ups" className="flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={16}/> Volver</Link>
        <p className="mt-6 text-pa-red">No pudimos cargar esta convocatoria.</p>
      </div>
    );
  }

  const cu = cuQ.data;
  const isEntreno = cu.kind === "entreno";
  const started = new Date(cu.starts_at).getTime() <= Date.now();
  const summaryRows = (rowsQ.data ?? []).map((r) => ({
    id: r.id,
    name: r.player?.full_name ?? "",
    wellness_sleep: r.wellness_sleep,
    wellness_energy: r.wellness_energy,
    wellness_mood: r.wellness_mood,
    wellness_soreness: r.wellness_soreness,
    wellness_at: r.wellness_at,
    rpe: r.rpe,
  }));
  const backTo = isAdmin ? (isEntreno ? "/entrenos" : "/call-ups") : "/mis-convocatorias";


  const page = (
    <div className="min-h-screen bg-background text-foreground">

      <header className="sticky top-0 z-40 backdrop-blur-md bg-paper/70 border-b border-ink/10">
        <div className="mx-auto max-w-4xl px-5 py-3.5 flex items-center justify-between">
          <Link to={backTo} className="flex items-center gap-2 text-sm font-semibold hover:opacity-70">
            <ArrowLeft size={16} /> Volver
          </Link>
          {isAdmin && (
            <button
              onClick={() => { if (confirm(isEntreno ? "¿Eliminar este entreno?" : "¿Eliminar este partido?")) deleteMut.mutate(); }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-pa-red hover:opacity-70"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${cu.kind === "partido" ? "bg-pa-red text-paper" : "bg-lime text-ink"}`}>
            {kindLabel(cu.kind)}
          </span>
          <span className="text-xs font-mono uppercase tracking-wider text-ink/50">{cu.categories?.name}</span>
        </div>
        <h1 className="mt-3 text-display text-3xl md:text-4xl font-bold leading-tight">
          {formatWhen(cu.starts_at)}
        </h1>
        <div className="mt-3 space-y-1 text-ink/70">
          {cu.place && <p className="flex items-center gap-2"><MapPin size={16}/> {cu.place}</p>}
          {cu.objetivo && (
            <div className="mt-3 rounded-xl border-2 border-ink bg-lime/20 px-4 py-3">
              <div className="text-xs font-mono uppercase tracking-wider text-ink/60">Objetivo del entreno</div>
              <p className="mt-1 font-semibold text-ink">{cu.objetivo}</p>
            </div>
          )}
          {cu.note && <p className="mt-2 rounded-xl border-2 border-ink/10 bg-card px-4 py-3 text-sm">{cu.note}</p>}
        </div>

        {isPlayer && myRow && (
          <PlayerResponse
            row={myRow}
            started={started}
            onGoing={() => respondMut.mutate({ status: "going" })}
            onDecline={(reason) => respondMut.mutate({ status: "declined", reason })}
            pending={respondMut.isPending}
          />
        )}

        {cu.kind === "entreno" && <PlanView activities={planQ.data ?? []} />}

        {isEntreno && isPlayer && myRow && cu.wellness_enabled && (
          <WellnessForm
            values={myRow}
            closed={started}
            saving={wellnessMut.isPending}
            onSave={(v) => wellnessMut.mutate(v)}
          />
        )}

        {isEntreno && isPlayer && myRow && cu.rpe_enabled && (
          <RpeForm
            value={myRow.rpe}
            savedAt={myRow.rpe_at}
            available={started}
            saving={rpeMut.isPending}
            onSave={(n) => rpeMut.mutate(n)}
          />
        )}

        {isAdmin && (
          <CoachView
            rows={rowsQ.data ?? []}
            loading={rowsQ.isLoading}
            started={started}
            onToggleAttendance={(rowId, attended) => attendanceMut.mutate({ rowId, attended })}
            onCopyAttendance={copyAttendanceList}
            copying={attendanceMut.isPending}
          />
        )}

        {isEntreno && isAdmin && cu.wellness_enabled && (
          <WellnessSummary rows={summaryRows} />
        )}
        {isEntreno && isAdmin && cu.rpe_enabled && (
          <RpeSummary rows={summaryRows} />
        )}
      </main>

    </div>
  );

  // Solo el staff ve el menú lateral; la jugadora usa su propio header.
  return isAdmin ? <StaffShell>{page}</StaffShell> : page;
}


function PlayerResponse({ row, started, onGoing, onDecline, pending }: {
  row: Row;
  started: boolean;
  onGoing: () => void;
  onDecline: (reason: string) => void;
  pending: boolean;
}) {
  const [showDecline, setShowDecline] = useState(false);
  const [reason, setReason] = useState(row.reason ?? "");

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold">Tu respuesta</h2>
      {row.status !== "pending" && (
        <p className="mt-1 text-sm text-ink/50">
          Ya respondiste: <span className="font-semibold">{row.status === "going" ? "Voy" : "No puedo"}</span>. Puedes cambiar tu respuesta.
        </p>
      )}
      {started && row.attended != null && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-sm font-semibold bg-paper">
          {row.attended ? (
            <><Check size={14} className="text-lime-deep" /> Asististe</>
          ) : (
            <><X size={14} className="text-pa-red" /> No se registró asistencia</>
          )}
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={onGoing} disabled={pending}
          className={`rounded-2xl border-2 px-5 py-6 font-display text-2xl font-bold transition-all ${row.status === "going" ? "bg-lime border-ink text-ink shadow-[4px_4px_0_0_var(--color-ink)]" : "border-ink bg-paper hover:bg-lime/30"}`}
        >
          <Check className="mx-auto mb-1" /> Voy
        </button>
        <button
          onClick={() => setShowDecline(true)} disabled={pending}
          className={`rounded-2xl border-2 px-5 py-6 font-display text-2xl font-bold transition-all ${row.status === "declined" ? "bg-pa-red border-ink text-paper shadow-[4px_4px_0_0_var(--color-ink)]" : "border-ink bg-paper hover:bg-pa-red/10"}`}
        >
          <X className="mx-auto mb-1" /> No puedo
        </button>
      </div>

      {showDecline && (
        <div className="mt-4 rounded-2xl border-2 border-ink bg-card p-5">
          <label className="text-xs font-mono uppercase tracking-wider text-ink/50">
            Motivo (opcional)
          </label>
          <textarea
            value={reason} onChange={(e) => setReason(e.target.value)}
            rows={2} placeholder="Tengo un examen ese día..."
            className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 resize-none"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => { onDecline(reason); setShowDecline(false); }}
              className="btn-primary !py-2 !px-4 !text-sm"
            >
              Confirmar "No puedo"
            </button>
            <button onClick={() => setShowDecline(false)} className="btn-ghost !py-2 !px-4 !text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function CoachView({ rows, loading, started, onToggleAttendance, onCopyAttendance, copying }: {
  rows: Row[];
  loading: boolean;
  started: boolean;
  onToggleAttendance: (id: string, attended: boolean) => void;
  onCopyAttendance: () => void;
  copying: boolean;
}) {
  const going = rows.filter((r) => r.status === "going");
  const declined = rows.filter((r) => r.status === "declined");
  const pending = rows.filter((r) => r.status === "pending");
  const read = pending.filter((r) => r.read_at);
  const unread = pending.filter((r) => !r.read_at);
  const attendedCount = going.filter((r) => r.attended).length;

  if (loading) return <p className="mt-10 text-sm text-ink/50">Cargando respuestas...</p>;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Respuestas</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onCopyAttendance}
            disabled={copying || going.length === 0}
            className="inline-flex items-center gap-1.5 text-sm font-semibold hover:text-lime-deep disabled:opacity-50"
          >
            <Copy size={14} /> Copiar lista
          </button>
          <div className="text-2xl font-display font-bold">
            {going.length} <span className="text-ink/40 text-base font-semibold">confirmadas · {attendedCount} asistieron</span>
          </div>
        </div>
      </div>
      {!started && (
        <p className="mt-3 text-xs font-semibold text-ink/50">
          Podrás marcar la asistencia después de que empiece.
        </p>
      )}


      <div className="mt-6 space-y-6">
        <Group title="Confirmadas" count={going.length} color="lime" icon={<Check size={14}/>} rows={going} showAttendance started={started} onToggleAttendance={onToggleAttendance} />
        <Group title="No puede" count={declined.length} color="red" icon={<X size={14}/>} rows={declined} showReason />
        <Group title="Leída sin responder" count={read.length} color="blue" icon={<Eye size={14}/>} rows={read} />
        <Group title="Sin responder" count={unread.length} color="gray" icon={<Clock size={14}/>} rows={unread} />
      </div>
    </section>
  );
}

function Group({ title, count, color, icon, rows, showReason, showAttendance, started, onToggleAttendance }: {
  title: string; count: number;
  color: "lime" | "red" | "blue" | "gray";
  icon: React.ReactNode; rows: Row[]; showReason?: boolean;
  showAttendance?: boolean;
  started?: boolean;
  onToggleAttendance?: (id: string, attended: boolean) => void;
}) {
  const tone = {
    lime: "bg-lime text-ink",
    red: "bg-pa-red text-paper",
    blue: "bg-pa-blue text-paper",
    gray: "bg-ink/10 text-ink",
  }[color];

  return (
    <div className="rounded-2xl border-2 border-ink bg-card overflow-hidden">
      <div className={`px-4 py-2.5 flex items-center gap-2 ${tone}`}>
        {icon}
        <span className="font-display font-bold uppercase tracking-wide text-sm">{title}</span>
        <span className="ml-auto font-mono text-xs opacity-80">{count}</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-3 text-sm text-ink/40">Nadie por aquí.</p>
      ) : (
        <ul className="divide-y divide-ink/10">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-3 flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper border-2 border-ink font-display font-bold text-sm">
                {r.player.jersey_number ?? r.player.full_name.charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{r.player.full_name}</p>
                {showReason && r.reason && (
                  <p className="text-xs text-ink/60 truncate">{r.reason}</p>
                )}
              </div>
              {showAttendance && onToggleAttendance && (
                <div className="inline-flex overflow-hidden rounded-full border-2 border-ink" role="group" aria-label={`Asistencia de ${r.player.full_name}`}>
                  <button
                    type="button"
                    disabled={!started}
                    aria-pressed={r.attended === true}
                    onClick={() => onToggleAttendance(r.id, true)}
                    title={started ? "Marcar que asistió" : "Podrás marcar la asistencia después de que empiece."}
                    className={`px-2.5 py-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed ${r.attended === true ? "bg-lime text-ink" : "bg-paper text-ink/60 hover:bg-lime/30"}`}
                  >
                    Asistió
                  </button>
                  <button
                    type="button"
                    disabled={!started}
                    aria-pressed={r.attended === false}
                    onClick={() => onToggleAttendance(r.id, false)}
                    title={started ? "Marcar que no asistió" : "Podrás marcar la asistencia después de que empiece."}
                    className={`px-2.5 py-1 text-xs font-bold border-l-2 border-ink disabled:opacity-50 disabled:cursor-not-allowed ${r.attended === false ? "bg-pa-red text-paper" : "bg-paper text-ink/60 hover:bg-ink/10"}`}
                  >
                    No
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
