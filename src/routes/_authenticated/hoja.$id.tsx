import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Copy, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StaffShell } from "@/components/staff/StaffShell";
import { friendlyError } from "@/lib/errors";
import { formatWhen } from "@/lib/call-ups";
import {
  DURATIONS, EVENT_ICON, EVENT_LABEL, addCompetition, addEvent, deleteCompetition, deleteEvent, getMatchSheet, lastDefaultsFor,
  listCompetitions, renameCompetition, saveReport, setLineup, summarizeMatch,
  type Competition, type EventKind, type LineupRole, type MatchReport,
} from "@/lib/hoja-partido";

export const Route = createFileRoute("/_authenticated/hoja/$id")({
  // ?nuevo=1 cuando se acaba de crear el partido.
  validateSearch: (s: Record<string, unknown>): { nuevo?: boolean } => ({ nuevo: s.nuevo === true || s.nuevo === "true" || s.nuevo === 1 ? true : undefined }),
  head: () => ({ meta: [{ title: "FullTime — Hoja del partido" }] }),
  component: HojaDePartido,
});

type Player = { id: string; name: string; jersey: number | null; status: string };

const ORDER: EventKind[] = ["gol", "autogol_rival", "gol_contra", "amarilla", "roja", "cambio", "lesion"];

function HojaDePartido() {
  const { id } = Route.useParams();
  const { nuevo } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const [verIncidencias, setVerIncidencias] = useState(false);
  const qc = useQueryClient();

  const cuQ = useQuery({
    queryKey: ["call-up", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_ups")
        .select("id, club_id, category_id, kind, starts_at, ends_at, meet_at, place, clubs(name), categories(name)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No encontramos el partido.");
      return data as any;
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
  const playersQ = useQuery({
    queryKey: ["hoja-players", id],
    enabled: !!isStaffQ.data,
    queryFn: async (): Promise<Player[]> => {
      const { data, error } = await supabase
        .from("call_up_players")
        .select("status, players(id, full_name, jersey_number)")
        .eq("call_up_id", id);
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => ({ id: r.players.id, name: r.players.full_name, jersey: r.players.jersey_number, status: r.status }))
        .sort((a: Player, b: Player) => (a.jersey ?? 999) - (b.jersey ?? 999) || a.name.localeCompare(b.name));
    },
  });
  const sheetQ = useQuery({ queryKey: ["hoja", id], enabled: !!isStaffQ.data, queryFn: () => getMatchSheet(id) });
  const lastDurQ = useQuery({
    queryKey: ["hoja-last-defaults", cuQ.data?.category_id],
    enabled: !!isStaffQ.data && !!cuQ.data?.category_id && sheetQ.isSuccess && !sheetQ.data?.report,
    queryFn: () => lastDefaultsFor(cuQ.data!.category_id),
  });
  const compsQ = useQuery({
    queryKey: ["hoja-competitions", cuQ.data?.club_id],
    enabled: !!isStaffQ.data && !!cuQ.data?.club_id,
    queryFn: () => listCompetitions(cuQ.data!.club_id),
  });

  // Datos del partido (se guardan con el botón o solos al anotar lo primero).
  const [form, setForm] = useState<Omit<MatchReport, "call_up_id">>({ opponent: "", competition: "", duration_min: 90, notes: "" });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (loaded || !sheetQ.data) return;
    const r = sheetQ.data.report;
    if (r) {
      setForm({ opponent: r.opponent ?? "", competition: r.competition ?? "", duration_min: r.duration_min, notes: r.notes ?? "" });
      setLoaded(true);
    } else if (lastDurQ.isFetched || !cuQ.data?.category_id) {
      const d = lastDurQ.data;
      if (d) setForm((f) => ({ ...f, duration_min: d.duration ?? f.duration_min, competition: d.competition ?? f.competition }));
      setLoaded(true);
    }
  }, [sheetQ.data, lastDurQ.isFetched, lastDurQ.data, loaded, cuQ.data?.category_id]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["hoja", id] });
  const ensureReport = async () => {
    if (!sheetQ.data?.report) await saveReport(id, form, cuQ.data?.club_id);
  };

  const reportMut = useMutation({
    mutationFn: () => saveReport(id, form, cuQ.data?.club_id),
    onSuccess: () => {
      toast.success("Datos del partido guardados");
      refresh();
      qc.invalidateQueries({ queryKey: ["hoja-competitions"] });
    },
    onError: (e) => toast.error(friendlyError(e, "No pudimos guardar. Vuelve a intentarlo.")),
  });
  const lineupMut = useMutation({
    mutationFn: async ({ playerId, role }: { playerId: string; role: LineupRole | null }) => {
      await ensureReport();
      await setLineup(id, playerId, role);
    },
    onSuccess: refresh,
    onError: (e) => toast.error(friendlyError(e, "No pudimos guardarlo. Vuelve a intentarlo.")),
  });
  const delEventMut = useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onSuccess: () => { toast.success("Incidencia borrada"); refresh(); },
    onError: (e) => toast.error(friendlyError(e, "No pudimos borrarla. Vuelve a intentarlo.")),
  });

  const [adding, setAdding] = useState<EventKind | null>(null);
  const [editComps, setEditComps] = useState(false);

  const players = playersQ.data ?? [];
  const nameOf = useMemo(() => {
    const m = new Map(players.map((p) => [p.id, p.name]));
    return (pid: string | null) => (pid ? m.get(pid) ?? "Jugadora" : "");
  }, [players]);

  const sheet = sheetQ.data;
  const duration = sheet?.report?.duration_min ?? form.duration_min;
  const summary = summarizeMatch(duration, sheet?.lineup ?? [], sheet?.events ?? []);
  const roleOf = (pid: string) => sheet?.lineup.find((l) => l.player_id === pid)?.role ?? null;
  const disponibles = players.filter((p) => p.status !== "declined");
  const titulares = disponibles.filter((p) => roleOf(p.id) === "titular").length;

  if (cuQ.isLoading || isStaffQ.isLoading) return <StaffShell><p className="p-10 text-ink/50">Cargando…</p></StaffShell>;
  if (cuQ.isError) return <StaffShell><p className="p-10 font-semibold text-pa-red">{friendlyError(cuQ.error, "No pudimos cargar el partido.")}</p></StaffShell>;
  const cu = cuQ.data;
  if (!isStaffQ.data || cu.kind !== "partido") {
    return <StaffShell><p className="p-10 font-semibold text-ink/70">La hoja del partido es solo para el cuerpo técnico y para partidos.</p></StaffShell>;
  }

  const clubName = cu.clubs?.name ?? "Nosotras";
  const empezo = new Date(cu.meet_at ?? cu.starts_at).getTime() <= Date.now();
  const mostrarPartido = empezo || verIncidencias || (sheet?.events ?? []).length > 0;
  const rival = (sheet?.report?.opponent ?? form.opponent) || "Rival";

  function copiarResumen() {
    const lines = [
      `${clubName} ${summary.goalsFor} – ${summary.goalsAgainst} ${rival}${sheet?.report?.competition ? ` (${sheet.report.competition})` : ""}`,
      formatWhen(cu.starts_at, cu.ends_at, cu.meet_at),
      "",
      ...(sheet?.events ?? []).map((e) => {
        const who = e.kind === "cambio" ? `${nameOf(e.player_in_id)} por ${nameOf(e.player_id)}` : nameOf(e.player_id);
        return `${e.minute != null ? `${e.minute}'` : "—"} ${EVENT_ICON[e.kind]} ${EVENT_LABEL[e.kind]}${who ? ` · ${who}` : ""}`;
      }),
      "",
      "Minutos:",
      ...disponibles
        .map((p) => ({ p, s: summary.players[p.id] }))
        .filter(({ s }) => s && s.minutes > 0)
        .sort((a, b) => b.s.minutes - a.s.minutes)
        .map(({ p, s }) => `${p.name}: ${s.minutes}'`),
    ];
    navigator.clipboard.writeText(lines.join("\n"))
      .then(() => toast.success("Resumen copiado. Pégalo en WhatsApp."))
      .catch(() => toast.error("No pudimos copiar. Vuelve a intentarlo."));
  }

  const inputCls = "mt-1 w-full rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2.5 outline-none";

  return (
    <StaffShell>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 backdrop-blur-md bg-paper/70 border-b border-ink/10">
          <div className="mx-auto max-w-4xl px-5 py-3.5 flex items-center justify-between">
            <Link to="/call-ups/$id" params={{ id }} className="flex items-center gap-2 text-sm font-semibold hover:opacity-70">
              <ArrowLeft size={16} /> Volver al partido
            </Link>
            <button onClick={copiarResumen} className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-70">
              <Copy size={14} /> Copiar resumen
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-5 py-8">
          {nuevo && (
            <div className="mb-5 rounded-2xl border-2 border-ink bg-lime/40 p-4">
              <p className="font-display text-lg font-bold">✅ Partido creado y aviso enviado</p>
              <p className="text-sm text-ink/70">
                Si ya lo tienes claro, pon el rival y marca titulares y suplentes. Si no, hazlo después: lo encuentras en el partido.
              </p>
            </div>
          )}
          <p className="text-xs font-mono uppercase tracking-wider text-ink/50">Hoja del partido · {cu.categories?.name}</p>
          <p className="mt-1 text-sm text-ink/60">
            {formatWhen(cu.starts_at, cu.ends_at, cu.meet_at)}
            {(sheet?.report?.competition ?? form.competition) ? ` · ${sheet?.report?.competition ?? form.competition}` : ""}
          </p>

          {/* Marcador */}
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border-2 border-ink bg-ink p-5 text-paper">
            <p className="truncate text-right font-display text-lg font-bold md:text-2xl">{clubName}</p>
            <p className="font-display text-4xl font-bold text-lime md:text-5xl">{summary.goalsFor} – {summary.goalsAgainst}</p>
            <p className="truncate font-display text-lg font-bold md:text-2xl">{rival}</p>
          </div>

          {sheetQ.isError && (
            <p className="mt-4 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
              No pudimos cargar la hoja. Recarga la página.
            </p>
          )}

          {/* 1. Datos */}
          <section className="mt-8 rounded-2xl border-2 border-ink bg-card p-5">
            <h2 className="font-display text-xl font-bold">1. Datos del partido</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm font-semibold">
              <label>Rival
                <input className={inputCls} value={form.opponent ?? ""} onChange={(e) => setForm({ ...form, opponent: e.target.value })} placeholder="Origen FC" />
              </label>
              <label>Competición
                <input className={inputCls} value={form.competition ?? ""} onChange={(e) => setForm({ ...form, competition: e.target.value })}
                  placeholder="LFF, Torneo Nacional Sub-16, Amistoso…" maxLength={80} />
                <span className="mt-2 flex flex-wrap items-center gap-1.5">
                  {(compsQ.data ?? []).map((c) => (
                    <button key={c.id} type="button" onClick={() => setForm({ ...form, competition: c.name })}
                      className={`rounded-full border-2 px-2.5 py-1 text-xs ${form.competition?.trim().toLowerCase() === c.name.toLowerCase() ? "border-ink bg-lime" : "border-ink/20 bg-paper"}`}>
                      {c.name}
                    </button>
                  ))}
                  <button type="button" onClick={() => setEditComps(true)} className="text-xs font-semibold underline text-ink/60">
                    {(compsQ.data ?? []).length > 0 ? "Editar lista" : "Crear lista de competiciones"}
                  </button>
                </span>
              </label>
              <div className="sm:col-span-2">¿Cuántos minutos dura el partido?
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {DURATIONS.map((d) => (
                    <button key={d} type="button" onClick={() => setForm({ ...form, duration_min: d })}
                      className={`rounded-full border-2 px-3 py-1.5 text-sm ${form.duration_min === d ? "border-ink bg-lime" : "border-ink/20 bg-paper"}`}>
                      {d}'
                    </button>
                  ))}
                  <input type="number" min={10} max={150} inputMode="numeric" aria-label="Otra duración"
                    value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: Math.min(150, Math.max(10, Number(e.target.value) || 10)) })}
                    className="w-20 rounded-xl border-2 border-ink/20 bg-paper px-2 py-1.5 text-sm" />
                </div>
              </div>
              <label className="sm:col-span-2">Notas
                <textarea className={`${inputCls} resize-none font-normal`} rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Cómo salimos, qué funcionó…" />
              </label>
            </div>
            <button onClick={() => reportMut.mutate()} disabled={reportMut.isPending} className="btn-primary mt-4 !py-2.5">
              {reportMut.isPending ? "Guardando…" : "Guardar datos"}
            </button>
          </section>

          {/* 2. Titulares */}
          <section className="mt-6 rounded-2xl border-2 border-ink bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-bold">2. Titulares y suplentes</h2>
              <span className="text-sm font-semibold text-ink/60">{titulares} titulares</span>
            </div>
            {playersQ.isLoading ? (
              <p className="mt-3 text-sm text-ink/50">Cargando…</p>
            ) : disponibles.length === 0 ? (
              <p className="mt-3 text-sm text-ink/60">No hay convocadas en este partido.</p>
            ) : (
              <ul className="mt-3 divide-y divide-ink/10">
                {disponibles.map((p) => {
                  const role = roleOf(p.id);
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                      <span className="w-8 font-mono text-xs text-ink/50">{p.jersey ?? ""}</span>
                      <span className="min-w-0 flex-1 font-semibold">{p.name}</span>
                      <div className="flex gap-1">
                        {(["titular", "suplente"] as LineupRole[]).map((r) => (
                          <button key={r} type="button" disabled={lineupMut.isPending}
                            onClick={() => lineupMut.mutate({ playerId: p.id, role: role === r ? null : r })}
                            className={`rounded-full border-2 px-3 py-1 text-xs font-semibold ${role === r ? (r === "titular" ? "border-ink bg-ink text-lime" : "border-ink bg-lime") : "border-ink/20 bg-paper"}`}>
                            {r === "titular" ? "Titular" : "Suplente"}
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {!mostrarPartido && (
            <section className="mt-6 rounded-2xl border-2 border-dashed border-ink/25 bg-paper p-5">
              <h2 className="font-display text-xl font-bold text-ink/60">3. Lo que pase en el partido</h2>
              <p className="mt-1 text-sm text-ink/60">
                Goles, tarjetas, cambios y lesiones se anotan durante o después del partido. Los minutos salen solos.
              </p>
              <button type="button" onClick={() => setVerIncidencias(true)} className="mt-2 text-sm font-semibold underline">
                Anotar ahora de todas formas
              </button>
            </section>
          )}

          {mostrarPartido && (<>
          {/* 3. Incidencias */}
          <section className="mt-6 rounded-2xl border-2 border-ink bg-card p-5">
            <h2 className="font-display text-xl font-bold">3. Lo que pasó</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {ORDER.map((k) => (
                <button key={k} type="button" onClick={() => setAdding(k)}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm font-semibold hover:bg-lime/40">
                  <span>{EVENT_ICON[k]}</span> {EVENT_LABEL[k]}
                </button>
              ))}
            </div>
            {(sheet?.events ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-ink/50">Todavía no anotas nada. Toca un botón de arriba.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {sheet!.events.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl border-2 border-ink/15 bg-paper px-3 py-2">
                    <span className="w-10 font-mono text-sm font-bold">{e.minute != null ? `${e.minute}'` : "—"}</span>
                    <span className="text-lg">{EVENT_ICON[e.kind]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">
                        {EVENT_LABEL[e.kind]}
                        {e.kind === "cambio"
                          ? ` · entra ${nameOf(e.player_in_id)}, sale ${nameOf(e.player_id)}`
                          : e.player_id ? ` · ${nameOf(e.player_id)}` : ""}
                      </p>
                      {e.note && <p className="text-xs text-ink/60">{e.note}</p>}
                    </div>
                    <button onClick={() => { if (confirm("¿Borrar esta incidencia?")) delEventMut.mutate(e.id); }}
                      aria-label="Borrar" className="text-pa-red hover:opacity-70"><Trash2 size={15} /></button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 4. Minutos */}
          <section className="mt-6 rounded-2xl border-2 border-ink bg-card p-5">
            <h2 className="font-display text-xl font-bold">4. Minutos y números</h2>
            <p className="text-xs text-ink/50">Se calculan solos con los titulares, los cambios, las rojas y las lesiones. Partido de {duration}'.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-mono uppercase tracking-wider text-ink/50">
                    <th className="py-2">Jugadora</th><th>Min</th><th>⚽</th><th>🟨</th><th>🟥</th><th>🩹</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {disponibles.map((p) => {
                    const s = summary.players[p.id];
                    return (
                      <tr key={p.id}>
                        <td className="py-2 font-semibold">{p.name}{s?.role ? <span className="ml-1 text-xs font-normal text-ink/50">{s.role}</span> : null}</td>
                        <td className="font-mono font-bold">{s?.minutes ?? 0}'</td>
                        <td>{s?.goals || ""}</td>
                        <td>{s?.yellow || ""}</td>
                        <td>{s?.red || ""}</td>
                        <td>{s?.injured ? "Sí" : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          </>)}

          <div className="mt-8 flex justify-center">
            <Link to="/call-ups/$id" params={{ id }} className="btn-primary">Listo, ir al partido</Link>
          </div>
        </main>

        {editComps && (
          <CompetitionsModal
            clubId={cu.club_id}
            items={compsQ.data ?? []}
            onClose={() => setEditComps(false)}
            onChanged={(renamed) => {
              qc.invalidateQueries({ queryKey: ["hoja-competitions"] });
              if (renamed) {
                refresh();
                if (form.competition?.trim().toLowerCase() === renamed.from.toLowerCase()) setForm((f) => ({ ...f, competition: renamed.to }));
              }
            }}
          />
        )}

        {adding && (
          <EventModal
            kind={adding}
            duration={duration}
            players={disponibles}
            onClose={() => setAdding(null)}
            onSave={async (ev) => {
              await ensureReport();
              await addEvent(id, ev);
              refresh();
              setAdding(null);
              toast.success(`${EVENT_LABEL[ev.kind]} anotado`);
            }}
          />
        )}
      </div>
    </StaffShell>
  );
}

function EventModal({ kind, duration, players, onClose, onSave }: {
  kind: EventKind; duration: number; players: Player[]; onClose: () => void;
  onSave: (ev: { kind: EventKind; minute: number | null; player_id: string | null; player_in_id: string | null; note: string | null }) => Promise<void>;
}) {
  const [minute, setMinute] = useState("");
  const [player, setPlayer] = useState("");
  const [playerIn, setPlayerIn] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const needsPlayer = kind !== "autogol_rival" && kind !== "gol_contra";

  async function submit() {
    setError("");
    const m = minute.trim() === "" ? null : Number(minute);
    if (m != null && (!Number.isInteger(m) || m < 0 || m > 150)) return setError("Escribe un minuto entre 0 y 150.");
    if (needsPlayer && !player) return setError(kind === "cambio" ? "Elige quién sale." : "Elige la jugadora.");
    if (kind === "cambio" && !playerIn) return setError("Elige quién entra.");
    if (kind === "cambio" && player === playerIn) return setError("La que entra y la que sale no pueden ser la misma.");
    setSaving(true);
    try {
      await onSave({ kind, minute: m, player_id: needsPlayer ? player : null, player_in_id: kind === "cambio" ? playerIn : null, note: kind === "lesion" ? note : null });
    } catch (e) {
      setError(friendlyError(e, "No pudimos anotarlo. Vuelve a intentarlo."));
      setSaving(false);
    }
  }

  const sel = "mt-1 w-full rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2.5 outline-none font-normal";
  const options = players.map((p) => <option key={p.id} value={p.id}>{p.jersey != null ? `${p.jersey} · ` : ""}{p.name}</option>);

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="w-full max-w-md rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{EVENT_ICON[kind]} {EVENT_LABEL[kind]}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        {kind === "autogol_rival" && <p className="mt-1 text-sm text-ink/60">Cuenta como gol nuestro, sin cargárselo a ninguna jugadora.</p>}
        {kind === "gol_contra" && <p className="mt-1 text-sm text-ink/60">Suma al rival. No se le carga a ninguna jugadora.</p>}

        <div className="mt-4 space-y-3 text-sm font-semibold">
          <label className="block">Minuto
            <input type="number" inputMode="numeric" min={0} max={150} className={sel} value={minute} onChange={(e) => setMinute(e.target.value)}
              placeholder={`0 a ${duration} (opcional)`} autoFocus />
          </label>
          {needsPlayer && (
            <label className="block">{kind === "cambio" ? "Sale" : kind === "gol" ? "¿Quién lo metió?" : "Jugadora"}
              <select className={sel} value={player} onChange={(e) => setPlayer(e.target.value)}>
                <option value="">Elige…</option>{options}
              </select>
            </label>
          )}
          {kind === "cambio" && (
            <label className="block">Entra
              <select className={sel} value={playerIn} onChange={(e) => setPlayerIn(e.target.value)}>
                <option value="">Elige…</option>{options}
              </select>
            </label>
          )}
          {kind === "lesion" && (
            <label className="block">¿Qué le pasó?
              <input className={sel} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tobillo derecho" maxLength={200} />
              <span className="mt-1 block text-xs font-normal text-ink/50">La ven el cuerpo técnico y la jugadora. Sus compañeras no.</span>
            </label>
          )}
          {kind === "lesion" && <p className="text-xs font-normal text-ink/50">Si entró otra en su lugar, anota también el cambio.</p>}
        </div>

        {error && <p className="mt-3 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? "Guardando…" : "Anotar"}</button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
        </div>
      </form>
    </div>
  );
}

function CompetitionsModal({ clubId, items, onClose, onChanged }: {
  clubId: string; items: Competition[]; onClose: () => void;
  onChanged: (renamed?: { from: string; to: string }) => void;
}) {
  const [nueva, setNueva] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>, after?: () => void) {
    setError("");
    setBusy(true);
    try {
      await fn();
      after?.();
    } catch (e) {
      setError(friendlyError(e, "No pudimos guardarlo. Vuelve a intentarlo."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">Competiciones</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <p className="mt-1 text-sm text-ink/60">
          Si cambias un nombre, se corrige también en los partidos donde la usaste. Si la borras, sale de la lista pero los partidos viejos la mantienen.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); if (nueva.trim()) run(() => addCompetition(clubId, nueva), () => { setNueva(""); onChanged(); }); }}
          className="mt-4 flex gap-2">
          <input value={nueva} onChange={(e) => setNueva(e.target.value)} maxLength={80} placeholder="Nueva: Torneo Nacional Sub-16"
            className="min-w-0 flex-1 rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2.5 outline-none" />
          <button type="submit" disabled={busy || !nueva.trim()} className="btn-primary !py-2.5">Agregar</button>
        </form>

        {items.length === 0 ? (
          <p className="mt-4 text-sm text-ink/50">Todavía no tienes competiciones.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/10">
            {items.map((c) => (
              <li key={c.id} className="flex items-center gap-2 py-2">
                {editId === c.id ? (
                  <form className="flex flex-1 gap-2"
                    onSubmit={(e) => { e.preventDefault(); run(() => renameCompetition(c.id, editName), () => { setEditId(null); onChanged({ from: c.name, to: editName.trim() }); }); }}>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={80} autoFocus aria-label="Nuevo nombre"
                      className="min-w-0 flex-1 rounded-lg border-2 border-ink/30 focus:border-ink bg-paper px-2 py-1.5 text-sm outline-none" />
                    <button type="submit" disabled={busy} className="btn-primary !py-1.5 !px-3 !text-sm">Guardar</button>
                    <button type="button" onClick={() => setEditId(null)} className="text-sm font-semibold text-ink/60">Cancelar</button>
                  </form>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 font-semibold">{c.name}</span>
                    <button type="button" onClick={() => { setEditId(c.id); setEditName(c.name); }} className="text-sm font-semibold underline">Cambiar nombre</button>
                    <button type="button" disabled={busy} aria-label={`Borrar ${c.name}`}
                      onClick={() => { if (confirm(`¿Sacar "${c.name}" de la lista? Los partidos viejos mantienen el nombre.`)) run(() => deleteCompetition(c.id), () => onChanged()); }}
                      className="text-pa-red hover:opacity-70"><Trash2 size={15} /></button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {error && <p className="mt-3 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">{error}</p>}
        <button type="button" onClick={onClose} className="btn-ghost mt-5">Listo</button>
      </div>
    </div>
  );
}
