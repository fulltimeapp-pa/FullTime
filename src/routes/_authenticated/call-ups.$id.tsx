import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Calendar, MapPin, Trash2, Check, X, Eye, Clock, Copy, Pencil, Bell, BellOff, UserX } from "lucide-react";
import { sendPush, getCallUpReach, type PlayerReach } from "@/lib/push.functions";
import { siteUrl } from "@/lib/site";
import { friendlyError, assertOnline, timeoutSignal, withTimeout } from "@/lib/errors";
import { CallUpFields, type CallUpFieldsValue } from "@/components/call-ups/CallUpFields";
import { supabase } from "@/integrations/supabase/client";
import { formatWhen, kindLabel, toStartEnd, toMatchTimes, type CallUp, type CallUpPlayerRow, type ResponseStatus } from "@/lib/call-ups";
import { PlanView } from "@/components/training/PlanView";
import { StaffShell } from "@/components/staff/StaffShell";
import { MatchSheetCard } from "@/components/match/MatchSheetCard";

import { WellnessSummary, RpeSummary } from "@/components/training/Wellness";
import { FormFill, FormResults } from "@/components/training/FormFill";
import { listForms, listResponses, resolveForm, saveResponse, type Answer, type FormKind } from "@/lib/formularios";
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
        .select("id, club_id, category_id, kind, starts_at, ends_at, meet_at, place, note, objetivo, wellness_enabled, rpe_enabled, wellness_form_id, rpe_form_id, created_by, created_at, categories(name)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No encontramos la convocatoria.");
      return data as CallUp & { wellness_enabled: boolean; rpe_enabled: boolean; wellness_form_id: string | null; rpe_form_id: string | null; categories: { name: string } | null };
    },
  });


  const isStaffQ = useQuery({
    queryKey: ["is-staff", cuQ.data?.club_id, user.id],
    enabled: !!cuQ.data?.club_id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_club_staff", { _user_id: user.id, _club_id: cuQ.data!.club_id });
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
  // Quién recibe los avisos (solo cuerpo técnico).
  const reachQ = useQuery({
    queryKey: ["call-up-reach", id],
    enabled: !!isStaffQ.data && !!cuQ.data,
    queryFn: () => getCallUpReach({ data: { call_up_id: id } }),
  });
  const reach = useMemo(
    () => new Map((reachQ.data ?? []).map((r: PlayerReach) => [r.player_id, r])),
    [reachQ.data],
  );

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

  const isStaff = !!isStaffQ.data;
  const isPlayer = !!myRow;

  useEffect(() => {
    if (!myRow || myRow.read_at) return;
    // Marca que la jugadora la abrió. Si falla no la molestamos; solo queda registrado.
    supabase.from("call_up_players").update({ read_at: new Date().toISOString() }).eq("id", myRow.id)
      .then(({ error }) => { if (error) console.error("No se pudo marcar como abierta", error); });
  }, [myRow]);

  const respondMut = useMutation({
    mutationFn: async ({ status, reason }: { status: ResponseStatus; reason?: string }) => {
      if (!myRow) throw new Error("No estás en esta convocatoria.");
      assertOnline();
      const { data, error } = await withTimeout(
        Promise.resolve(
          supabase.from("call_up_players").update({
            status, reason: reason?.trim() || null, responded_at: new Date().toISOString(),
          }).eq("id", myRow.id).select("id").abortSignal(timeoutSignal()),
        ),
      );
      if (error) throw error;
      // Si no se actualizó ninguna fila, no se guardó: mejor decirlo que fingir que sí.
      if (!data || data.length === 0) throw new Error("No pudimos guardar tu respuesta.");
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["call-up-rows", id] });
      toast.success(vars.status === "going" ? "¡Listo! Tu profe ya sabe que vas." : "Listo. Tu profe ya sabe que no puedes.");
    },
    onError: (e, vars) => {
      console.error("No se guardó la respuesta", e);
      toast.error(`${friendlyError(e, "No pudimos guardar tu respuesta.")} Tu profe todavía no la ve.`, {
        duration: 15000,
        action: { label: "Reintentar", onClick: () => respondMut.mutate(vars) },
      });
    },
  });

  // Wellness y RPE con los formularios del club (o las plantillas por defecto).
  const usaFormularios = !!cuQ.data && cuQ.data.kind === "entreno" && (cuQ.data.wellness_enabled || cuQ.data.rpe_enabled);
  const formsQ = useQuery({
    queryKey: ["club-forms", cuQ.data?.club_id],
    enabled: usaFormularios,
    queryFn: () => listForms(cuQ.data!.club_id),
  });
  const responsesQ = useQuery({
    queryKey: ["form-responses", id],
    enabled: usaFormularios,
    queryFn: () => listResponses(id),
  });
  const formMut = useMutation({
    mutationFn: async ({ kind, values }: { kind: FormKind; values: Record<string, Answer["value"]> }) => {
      if (!myRow) throw new Error("No estás en esta convocatoria.");
      assertOnline();
      const f = resolveForm(kind, kind === "wellness" ? cuQ.data?.wellness_form_id : cuQ.data?.rpe_form_id, formsQ.data ?? []);
      await withTimeout(saveResponse({ callUpId: id, playerId: myRow.player_id, kind, formId: f.id, questions: f.questions, values }));
    },
    onSuccess: (_d, { kind }) => {
      toast.success(kind === "wellness" ? "¡Listo! El Profe ya sabe cómo llegas." : "¡Gracias! RPE enviado.");
      qc.invalidateQueries({ queryKey: ["form-responses", id] });
    },
    onError: (e, vars) =>
      toast.error(friendlyError(e, "No pudimos guardar tus respuestas."), {
        duration: 15000,
        action: { label: "Reintentar", onClick: () => formMut.mutate(vars) },
      }),
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

  function copyCallUpMessage() {
    const c = cuQ.data;
    if (!c) return;
    const texto = [
      `${kindLabel(c.kind)} · ${formatWhen(c.starts_at, c.ends_at, c.meet_at)}`,
      c.place ? `📍 ${c.place}` : "",
      `Confirma aquí si vas: ${siteUrl(`/call-ups/${id}`)}`,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(texto).then(
      () => toast.success("Mensaje copiado. Pégalo en WhatsApp."),
      () => toast.error("No pudimos copiar. Intenta de nuevo."),
    );
  }

  function copyAttendanceList() {
    const rows = rowsQ.data ?? [];
    const going = rows.filter((r) => r.status === "going");
    const nombre = (r: Row) => `${r.player.full_name}${r.player.jersey_number ? ` (#${r.player.jersey_number})` : ""}`;
    const grupos: [string, Row[]][] = [
      ["ASISTIERON", going.filter((r) => r.attended === true)],
      ["NO ASISTIERON", going.filter((r) => r.attended === false)],
      ["SIN MARCAR", going.filter((r) => r.attended == null)],
    ];
    const lines = [
      `${kindLabel(cuQ.data!.kind)} · ${formatWhen(cuQ.data!.starts_at, cuQ.data!.ends_at, cuQ.data!.meet_at)}`,
      `Confirmaron: ${going.length} · Asistieron: ${grupos[0][1].length}`,
      // Solo los grupos que tienen a alguien.
      ...grupos.filter(([, g]) => g.length > 0).flatMap(([titulo, g]) => ["", `${titulo} (${g.length}):`, ...g.map(nombre)]),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(
      () => toast.success("Lista copiada. Pégala en WhatsApp."),
      () => toast.error("No pudimos copiar la lista. Intenta de nuevo."),
    );
  }


  // --- Edición de la convocatoria (sólo cuerpo técnico) ---
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [form, setForm] = useState<CallUpFieldsValue>({
    date: "", time: "", endTime: "", meetTime: "", place: "", note: "", objetivo: "",
  });
  // Jugadoras convocadas mientras se edita (ids de players).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Plantel de la categoría, para poder sumar jugadoras al editar.
  const catPlayersQ = useQuery({
    queryKey: ["players-of-cat", cuQ.data?.category_id],
    enabled: isStaff && !!cuQ.data?.category_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players").select("id, full_name, jersey_number")
        .eq("category_id", cuQ.data!.category_id).order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string; jersey_number: number | null }[];
    },
  });

  // Plantel de la categoría + quien ya esté convocada aunque sea de otra categoría.
  const editablePlayers = useMemo(() => {
    const map = new Map<string, { id: string; full_name: string; jersey_number: number | null }>();
    for (const p of catPlayersQ.data ?? []) map.set(p.id, p);
    for (const r of rowsQ.data ?? []) {
      if (r.player && !map.has(r.player_id)) {
        map.set(r.player_id, { id: r.player_id, full_name: r.player.full_name, jersey_number: r.player.jersey_number });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [catPlayersQ.data, rowsQ.data]);

  function toggleSelected(playerId: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(playerId)) n.delete(playerId); else n.add(playerId);
      return n;
    });
  }

  function openEdit() {
    const c = cuQ.data;
    if (!c) return;
    const d = new Date(c.starts_at);
    const pad = (n: number) => String(n).padStart(2, "0");
    setForm({
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      endTime: c.ends_at
        ? `${pad(new Date(c.ends_at).getHours())}:${pad(new Date(c.ends_at).getMinutes())}`
        : "",
      meetTime: c.meet_at
        ? `${pad(new Date(c.meet_at).getHours())}:${pad(new Date(c.meet_at).getMinutes())}`
        : "",
      place: c.place ?? "",
      note: c.note ?? "",
      objetivo: c.objetivo ?? "",
    });
    setSelectedIds(new Set((rowsQ.data ?? []).map((r) => r.player_id)));
    setEditError("");
    setEditing(true);
  }

  function submitEdit() {
    setEditError("");
    // Avisar antes de quitar a alguien que ya respondió: se pierde su respuesta.
    const respondedRemoved = (rowsQ.data ?? []).filter(
      (r) => !selectedIds.has(r.player_id) && r.status !== "pending",
    );
    if (respondedRemoved.length > 0) {
      const names = respondedRemoved.map((r) => r.player?.full_name ?? "una jugadora").join(", ");
      const ok = confirm(`Vas a quitar a ${names}, que ya respondió. Se pierde su respuesta. ¿Seguir?`);
      if (!ok) return;
    }
    editMut.mutate();
  }

  const editMut = useMutation({
    mutationFn: async () => {
      const c = cuQ.data!;
      if (!form.place.trim()) throw new Error("Indica el lugar.");
      const times = c.kind === "partido"
        ? toMatchTimes(form.date, form.meetTime, form.time)
        : { ...toStartEnd(form.date, form.time, form.endTime), meet_at: null };
      const startsAt = times.starts_at;
      const horaCambio =
        startsAt !== new Date(c.starts_at).toISOString() ||
        (times.meet_at ?? null) !== (c.meet_at ? new Date(c.meet_at).toISOString() : null);
      const lugarCambio = form.place.trim() !== (c.place ?? "");
      if (selectedIds.size === 0) throw new Error("Deja al menos una jugadora convocada.");

      const current = new Set((rowsQ.data ?? []).map((r) => r.player_id));
      const toAdd = Array.from(selectedIds).filter((pid) => !current.has(pid));
      const toRemove = Array.from(current).filter((pid) => !selectedIds.has(pid));
      const kept = Array.from(current).filter((pid) => selectedIds.has(pid));

      const { error } = await supabase
        .from("call_ups")
        .update({
          starts_at: startsAt,
          ends_at: times.ends_at,
          meet_at: times.meet_at,
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

      if (toRemove.length > 0) {
        const { error: dErr } = await supabase
          .from("call_up_players").delete()
          .eq("call_up_id", id).in("player_id", toRemove);
        if (dErr) throw new Error("Se guardaron los datos, pero no pudimos quitar a las jugadoras. Intenta de nuevo.");
      }
      if (toAdd.length > 0) {
        const { error: iErr } = await supabase
          .from("call_up_players")
          .insert(toAdd.map((pid) => ({ call_up_id: id, player_id: pid })));
        if (iErr) throw new Error("Se guardaron los datos, pero no pudimos sumar a las jugadoras. Intenta de nuevo.");
      }
      return { avisar: horaCambio || lugarCambio, added: toAdd, kept };
    },
    onSuccess: async ({ avisar, added, kept }) => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["call-up", id] });
      qc.invalidateQueries({ queryKey: ["call-up-rows", id] });
      qc.invalidateQueries({ queryKey: ["call-ups"] });
      qc.invalidateQueries({ queryKey: ["entrenos"] });
      toast.success("Cambio guardado");
      try {
        // Las nuevas reciben "Nueva convocatoria"; las que ya estaban, el aviso de cambio.
        if (added.length > 0) {
          await sendPush({ data: { call_up_id: id, kind: "new", player_ids: added } });
        }
        if (avisar && kept.length > 0) {
          await sendPush({ data: { call_up_id: id, kind: "updated", player_ids: kept } });
        }
      } catch (e) {
        console.warn("No se pudo enviar el aviso", e);
        toast.error("Se guardó el cambio, pero no pudimos avisar a las jugadoras.");
      }
    },
    onError: (e: any) => setEditError(e?.message || "No pudimos guardar el cambio. Intenta de nuevo."),
  });

  // Recordar solo a las que siguen sin responder.
  const remindMut = useMutation({
    mutationFn: async () => sendPush({ data: { call_up_id: id, kind: "reminder", only_pending: true } }),
    onSuccess: (r) => {
      if (r.targeted === 0) {
        toast.success("Todas ya respondieron.");
      } else if (r.reachable === 0) {
        toast.warning(
          `Ninguna de las ${r.targeted} tiene los avisos activados. Mándales el link de la convocatoria.`,
        );
      } else if (r.reachable < r.targeted) {
        toast.success(
          `Les recordamos a ${r.reachable} de ${r.targeted}. A ${r.targeted - r.reachable} les faltan los avisos: mándales el link.`,
        );
      } else {
        toast.success(`Les recordamos a las ${r.targeted} que no han respondido.`);
      }
    },
    onError: () => toast.error("No pudimos enviar el recordatorio. Intenta de nuevo."),
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
    onError: (e) => toast.error(friendlyError(e, "No pudimos eliminarla. Vuelve a intentarlo.")),
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
  const convocadasActivas = (rowsQ.data ?? [])
    .filter((r) => r.status !== "declined")
    .map((r) => ({ playerId: r.player_id, name: r.player?.full_name ?? "" }));
  const backTo = isStaff ? (isEntreno ? "/entrenos" : "/call-ups") : "/mis-convocatorias";


  const page = (
    <div className="min-h-screen bg-background text-foreground">

      <header className="sticky top-0 z-40 backdrop-blur-md bg-paper/70 border-b border-ink/10">
        <div className="mx-auto max-w-4xl px-5 py-3.5 flex items-center justify-between">
          <Link to={backTo} className="flex items-center gap-2 text-sm font-semibold hover:opacity-70">
            <ArrowLeft size={16} /> Volver
          </Link>
          {isStaff && (
            <div className="flex items-center gap-4">
              {!editing && (
                <button
                  onClick={openEdit}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-70"
                >
                  <Pencil size={14} /> Editar
                </button>
              )}
              <button
                onClick={() => { if (confirm(isEntreno ? "¿Eliminar este entreno?" : "¿Eliminar este partido?")) deleteMut.mutate(); }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-pa-red hover:opacity-70"
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
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
          {formatWhen(cu.starts_at, cu.ends_at, cu.meet_at)}
        </h1>

        {isStaff && editing ? (
          <form
            onSubmit={(e) => { e.preventDefault(); submitEdit(); }}
            className="mt-6 space-y-6 rounded-2xl border-2 border-ink bg-card p-5"
          >
            <p className="text-sm text-ink/60">
              Cambia lo que haga falta. Las respuestas que ya dieron tus jugadoras se mantienen, y les
              llega un aviso si cambias la fecha, la hora o la cancha. Si sumas a alguien, le llega
              la convocatoria.
            </p>

            <CallUpFields
              value={form}
              onChange={(p) => setForm((prev) => ({ ...prev, ...p }))}
              showObjetivo={isEntreno}
              kind={isEntreno ? "entreno" : "partido"}
              disabled={editMut.isPending}
            />

            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-ink/50">
                Convocadas ({selectedIds.size} de {editablePlayers.length})
              </label>
              <div className="mt-2 rounded-xl border-2 border-ink bg-paper divide-y divide-ink/10 max-h-72 overflow-auto">
                {catPlayersQ.isLoading ? (
                  <p className="p-4 text-sm text-ink/50">Cargando plantel...</p>
                ) : catPlayersQ.isError ? (
                  <p className="p-4 text-sm text-pa-red">No pudimos cargar el plantel. Cierra y vuelve a abrir Editar.</p>
                ) : (
                  editablePlayers.map((p) => {
                    const on = selectedIds.has(p.id);
                    return (
                      <button
                        key={p.id} type="button"
                        onClick={() => toggleSelected(p.id)}
                        disabled={editMut.isPending}
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

            {editError && (
              <div className="rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
                {editError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button type="submit" disabled={editMut.isPending} className="btn-primary">
                {editMut.isPending ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setEditError(""); }}
                disabled={editMut.isPending}
                className="btn-ghost"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
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
        )}

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

        {cu.kind === "partido" && (isStaff || isPlayer) && (
          <MatchSheetCard callUpId={id} isStaff={isStaff} playerId={myRow?.player_id ?? null} started={started} />
        )}

        {isEntreno && isPlayer && myRow && cu.wellness_enabled && formsQ.isSuccess && responsesQ.isSuccess && (
          <FormFill
            key={`w-${responsesQ.dataUpdatedAt}`}
            kind="wellness"
            questions={resolveForm("wellness", cu.wellness_form_id, formsQ.data).questions}
            response={responsesQ.data.find((r) => r.kind === "wellness" && r.player_id === myRow.player_id) ?? null}
            open={!started}
            closedText="El entreno ya empezó. Tu wellness quedó guardado así."
            saving={formMut.isPending}
            onSave={(values) => formMut.mutate({ kind: "wellness", values })}
          />
        )}

        {isEntreno && isPlayer && myRow && cu.rpe_enabled && formsQ.isSuccess && responsesQ.isSuccess && (
          <FormFill
            key={`r-${responsesQ.dataUpdatedAt}`}
            kind="rpe"
            questions={resolveForm("rpe", cu.rpe_form_id, formsQ.data).questions}
            response={responsesQ.data.find((r) => r.kind === "rpe" && r.player_id === myRow.player_id) ?? null}
            open={started}
            closedText="Vas a poder responder cuando arranque el entreno."
            saving={formMut.isPending}
            onSave={(values) => formMut.mutate({ kind: "rpe", values })}
          />
        )}

        {isStaff && (
          <CoachView
            rows={rowsQ.data ?? []}
            loading={rowsQ.isLoading}
            started={started}
            onToggleAttendance={(rowId, attended) => attendanceMut.mutate({ rowId, attended })}
            onCopyAttendance={copyAttendanceList}
            copying={attendanceMut.isPending}
            onRemind={() => remindMut.mutate()}
            reminding={remindMut.isPending}
            reach={reachQ.data ? reach : null}
            onCopyMessage={copyCallUpMessage}
            notCalled={(catPlayersQ.data ?? []).filter(
              (p) => !(rowsQ.data ?? []).some((r) => r.player_id === p.id),
            )}
          />
        )}

        {isEntreno && isStaff && cu.wellness_enabled && formsQ.isSuccess && (
          <FormResults kind="wellness" questions={resolveForm("wellness", cu.wellness_form_id, formsQ.data).questions}
            rows={convocadasActivas} responses={responsesQ.data ?? []} />
        )}
        {isEntreno && isStaff && cu.rpe_enabled && formsQ.isSuccess && (
          <FormResults kind="rpe" questions={resolveForm("rpe", cu.rpe_form_id, formsQ.data).questions}
            rows={convocadasActivas} responses={responsesQ.data ?? []} />
        )}
        {/* Respuestas de antes de los formularios editables (9-oct). */}
        {isEntreno && isStaff && summaryRows.some((r) => r.wellness_at) && <WellnessSummary rows={summaryRows} />}
        {isEntreno && isStaff && summaryRows.some((r) => r.rpe != null) && <RpeSummary rows={summaryRows} />}
      </main>

    </div>
  );

  // Solo el staff ve el menú lateral; la jugadora usa su propio header.
  return isStaff ? <StaffShell>{page}</StaffShell> : page;
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

function CoachView({ rows, loading, started, onToggleAttendance, onCopyAttendance, copying, onRemind, reminding, notCalled, reach, onCopyMessage }: {
  rows: Row[];
  loading: boolean;
  started: boolean;
  onToggleAttendance: (id: string, attended: boolean) => void;
  onCopyAttendance: () => void;
  copying: boolean;
  onRemind: () => void;
  reminding: boolean;
  notCalled: { id: string; full_name: string; jersey_number: number | null }[];
  reach: Map<string, PlayerReach> | null;
  onCopyMessage: () => void;
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
      {reach && rows.length > 0 && (
        <AvisoResumen rows={rows} reach={reach} onCopyMessage={onCopyMessage} />
      )}

      {!started && pending.length > 0 && (
        <button
          type="button"
          onClick={onRemind}
          disabled={reminding}
          className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-lime px-5 py-3 font-semibold text-ink hover:shadow-[3px_3px_0_0_var(--color-ink)] disabled:opacity-60"
        >
          <Bell size={16} />
          {reminding
            ? "Enviando..."
            : `Recordar a las que no han respondido (${pending.length})`}
        </button>
      )}
      {!started && (
        <p className="mt-3 text-xs font-semibold text-ink/50">
          Podrás marcar la asistencia después de que empiece.
        </p>
      )}


      <div className="mt-6 space-y-6">
        <Group title="Confirmadas" count={going.length} color="lime" icon={<Check size={14}/>} rows={going} showAttendance started={started} onToggleAttendance={onToggleAttendance} />
        <Group title="No va" count={declined.length} color="red" icon={<X size={14}/>} rows={declined} showReason />
        <Group title="La abrió, sin responder" count={read.length} color="blue" icon={<Eye size={14}/>} rows={read} reach={reach} />
        <Group title="No la ha abierto" count={unread.length} color="gray" icon={<Clock size={14}/>} rows={unread} reach={reach} />
        {notCalled.length > 0 && (
          <div className="rounded-2xl border-2 border-dashed border-ink/30 bg-paper overflow-hidden">
            <div className="px-4 py-2.5 flex items-center gap-2 text-ink/60">
              <X size={14} />
              <span className="font-display font-bold uppercase tracking-wide text-sm">No convocadas</span>
              <span className="ml-auto font-mono text-xs">{notCalled.length}</span>
            </div>
            <ul className="divide-y divide-ink/10">
              {notCalled.map((p) => (
                <li key={p.id} className="px-4 py-3 flex items-center gap-3 text-ink/60">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink/30 font-display font-bold text-sm">
                    {p.jersey_number ?? p.full_name.charAt(0).toUpperCase()}
                  </span>
                  <p className="font-semibold truncate">{p.full_name}</p>
                </li>
              ))}
            </ul>
            <p className="px-4 py-2.5 text-xs text-ink/50 border-t border-ink/10">
              Para convocarlas, toca Editar arriba.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function Group({ title, count, color, icon, rows, showReason, showAttendance, started, onToggleAttendance, reach }: {
  title: string; count: number;
  reach?: Map<string, PlayerReach> | null;
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
                {reach?.get(r.player_id) && !reach.get(r.player_id)!.linked && (
                  <p className="text-xs font-semibold text-pa-red inline-flex items-center gap-1">
                    <UserX size={12} /> Todavía no entra a la app
                  </p>
                )}
                {reach?.get(r.player_id)?.linked && !reach.get(r.player_id)!.has_push && (
                  <p className="text-xs font-semibold text-ink/60 inline-flex items-center gap-1">
                    <BellOff size={12} /> No recibe avisos
                  </p>
                )}
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

function AvisoResumen({ rows, reach, onCopyMessage }: {
  rows: Row[];
  reach: Map<string, PlayerReach>;
  onCopyMessage: () => void;
}) {
  const total = rows.length;
  const conAviso = rows.filter((r) => reach.get(r.player_id)?.has_push).length;
  const sinCuenta = rows.filter((r) => reach.get(r.player_id) && !reach.get(r.player_id)!.linked).length;
  const sinAvisos = total - conAviso - sinCuenta;
  const todas = conAviso === total;

  return (
    <div className={`mt-4 rounded-2xl border-2 border-ink p-4 ${todas ? "bg-lime/30" : "bg-paper"}`}>
      <p className="font-display text-lg font-bold">
        {todas ? `Las ${total} reciben los avisos ✓` : `${conAviso} de ${total} reciben los avisos`}
      </p>
      {!todas && (
        <ul className="mt-1 space-y-0.5 text-sm text-ink/70">
          {sinAvisos > 0 && (
            <li>
              A {sinAvisos} {sinAvisos === 1 ? "le faltan" : "les faltan"} las notificaciones: mándales el mensaje por WhatsApp.
            </li>
          )}
          {sinCuenta > 0 && (
            <li>
              {sinCuenta} todavía no {sinCuenta === 1 ? "entra" : "entran"} a la app: mándales su invitación desde Plantel.
            </li>
          )}
        </ul>
      )}
      <button
        type="button"
        onClick={onCopyMessage}
        className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-paper px-4 py-2.5 text-sm font-semibold hover:bg-lime/30"
      >
        <Copy size={14} /> Copiar mensaje para WhatsApp
      </button>
    </div>
  );
}
