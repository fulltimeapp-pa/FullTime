import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bandage, Check, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StaffShell } from "@/components/staff/StaffShell";
import { getMyActiveClub } from "@/lib/active-club";
import { friendlyError } from "@/lib/errors";
import { DateField, formatDayEs } from "@/components/ui/date-field";
import { BodyMap } from "@/components/injuries/BodyMap";
import {
  INJURY_TYPES, ZONES, byZone, daysOut, deleteInjury, dischargeInjury, isActive, listInjuries, saveInjury, suggestZone,
  injuryTypeText, zoneText,
  type BodySide, type Injury, type InjuryInput, type InjuryType, type Laterality, type Zone,
} from "@/lib/lesiones";

export const Route = createFileRoute("/_authenticated/lesiones")({
  head: () => ({ meta: [{ title: "FullTime — Lesiones" }] }),
  component: () => (
    <StaffShell>
      <LesionesPage />
    </StaffShell>
  ),
});

const hoyPA = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);

type Draft = { id?: string; value: InjuryInput };

function LesionesPage() {
  const qc = useQueryClient();
  const hoy = hoyPA();
  const [catId, setCatId] = useState("");
  const [soloLesionadas, setSoloLesionadas] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [tab, setTab] = useState<"activas" | "historial">("activas");
  const [draft, setDraft] = useState<Draft | null>(null);

  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });
  const clubId = clubQ.data?.club_id;
  const catsQ = useQuery({
    queryKey: ["categories", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").eq("club_id", clubId!).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const playersQ = useQuery({
    queryKey: ["stats-players", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("id, full_name, jersey_number, category_id").eq("club_id", clubId!);
      if (error) throw error;
      return data ?? [];
    },
  });
  const injQ = useQuery({ queryKey: ["injuries", clubId], enabled: !!clubId, queryFn: () => listInjuries(clubId!) });

  const refresh = () => qc.invalidateQueries({ queryKey: ["injuries", clubId] });
  const altaMut = useMutation({
    mutationFn: (id: string) => dischargeInjury(id, hoy),
    onSuccess: () => { toast.success("Alta registrada. Ya está disponible."); refresh(); },
    onError: (e) => toast.error(friendlyError(e, "No pudimos registrar el alta. Vuelve a intentarlo.")),
  });

  const all = injQ.data ?? [];
  const activeOf = useMemo(() => {
    const m = new Map<string, Injury[]>();
    for (const i of all) if (isActive(i, hoy)) m.set(i.player_id, [...(m.get(i.player_id) ?? []), i]);
    return m;
  }, [all, hoy]);

  const players = (playersQ.data ?? [])
    .filter((p) => (!catId || p.category_id === catId) && (!soloLesionadas || activeOf.has(p.id)))
    .sort((a, b) => Number(activeOf.has(b.id)) - Number(activeOf.has(a.id)) || a.full_name.localeCompare(b.full_name));
  const idsVisibles = new Set((playersQ.data ?? []).filter((p) => !catId || p.category_id === catId).map((p) => p.id));
  const patrones = byZone(all.filter((i) => idsVisibles.has(i.player_id))).slice(0, 5);
  const lesionadasHoy = [...activeOf.keys()].filter((id) => idsVisibles.has(id)).length;

  const player = (playersQ.data ?? []).find((p) => p.id === playerId) ?? null;
  const suyas = all.filter((i) => i.player_id === playerId).sort((a, b) => b.injured_on.localeCompare(a.injured_on));
  const activas = suyas.filter((i) => isActive(i, hoy));
  const lista = tab === "activas" ? activas : suyas;
  // Número de cada lesión en la figura: la más vieja es la 1.
  const numero = new Map([...suyas].reverse().map((i, k) => [i.id, k + 1]));
  const marcas = (side: BodySide) =>
    lista.filter((i) => i.body_side === side).map((i) => ({ id: i.id, x: i.pos_x, y: i.pos_y, n: numero.get(i.id) ?? 0, active: isActive(i, hoy) }));

  function nueva(side: BodySide, x: number, y: number) {
    const s = suggestZone(side, x, y);
    setDraft({
      value: { body_side: side, pos_x: x, pos_y: y, zone: s.zone, laterality: s.laterality, injury_type: "golpe", injury_type_other: "", description: "", injured_on: hoy, expected_return: null, returned_on: null },
    });
  }
  const editar = (i: Injury) =>
    setDraft({ id: i.id, value: { body_side: i.body_side, pos_x: i.pos_x, pos_y: i.pos_y, zone: i.zone, laterality: i.laterality, injury_type: i.injury_type, injury_type_other: i.injury_type_other ?? "", description: i.description ?? "", injured_on: i.injured_on, expected_return: i.expected_return, returned_on: i.returned_on } });

  const sel = "rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm font-semibold";

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <span className="chip"><Bandage size={12} className="inline-block -mt-0.5" /> Salud</span>
      <h1 className="mt-4 text-display text-4xl md:text-5xl font-bold leading-[0.95]">
        Lesio<span className="marker-underline">nes</span>
      </h1>
      <p className="mt-3 text-muted-foreground">
        Solo las ve el cuerpo técnico de la categoría y cada jugadora las suyas. Sus compañeras no.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <select value={catId} onChange={(e) => { setCatId(e.target.value); setPlayerId(null); }} className={sel} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {(catsQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={soloLesionadas} onChange={(e) => setSoloLesionadas(e.target.checked)} className="h-4 w-4" />
          Solo lesionadas ({lesionadasHoy})
        </label>
      </div>

      {(injQ.isError || playersQ.isError) && (
        <p className="mt-6 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          {friendlyError(injQ.error ?? playersQ.error, "No pudimos cargar las lesiones. Recarga la página.")}
        </p>
      )}

      {patrones.length > 0 && (
        <section className="mt-6 rounded-2xl border-2 border-ink bg-card p-5">
          <h2 className="font-display text-lg font-bold">Zonas con más lesiones</h2>
          <p className="text-xs text-ink/50">De todo el historial{catId ? " de esta categoría" : ""}. Sirve para ver patrones.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {patrones.map((z) => (
              <span key={z.zone} className="rounded-full border-2 border-ink/20 bg-paper px-3 py-1 text-sm font-semibold">
                {z.label} <span className="font-mono text-ink/50">× {z.n}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,280px)_1fr]">
        {/* Jugadoras */}
        <section className="rounded-2xl border-2 border-ink bg-card p-3">
          {playersQ.isLoading ? (
            <p className="p-3 text-sm text-ink/50">Cargando…</p>
          ) : players.length === 0 ? (
            <p className="p-3 text-sm text-ink/60">{soloLesionadas ? "Nadie está lesionada. 🎉" : "No hay jugadoras."}</p>
          ) : (
            <ul className="max-h-[28rem] space-y-1 overflow-y-auto">
              {players.map((p) => {
                const act = activeOf.get(p.id);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => { setPlayerId(p.id); setTab(act ? "activas" : "historial"); }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left ${playerId === p.id ? "bg-lime/50" : "hover:bg-ink/5"}`}
                    >
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] ${act ? "bg-pa-red text-paper" : "bg-lime text-ink"}`}>
                        {act ? "🩹" : <Check size={13} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{p.full_name}</span>
                        <span className={`block text-xs ${act ? "font-semibold text-pa-red" : "text-ink/50"}`}>
                          {act
                            ? `Lesionada${act[0].expected_return ? ` · alta prevista ${formatDayEs(act[0].expected_return)}` : ""}`
                            : "Disponible"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Ficha */}
        <section className="rounded-2xl border-2 border-ink bg-card p-5">
          {!player ? (
            <p className="py-10 text-center text-sm text-ink/60">Elige una jugadora para ver o anotar sus lesiones.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl font-bold">{player.full_name}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${activas.length ? "bg-pa-red text-paper" : "bg-lime text-ink"}`}>
                  {activas.length ? "Lesionada" : "Disponible"}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink/60"><b className="text-ink">Toca la zona lesionada</b> en la figura para anotar una lesión nueva.</p>

              <div className="mt-4 flex justify-center gap-6">
                <BodyMap side="frente" markers={marcas("frente")} onTap={(x, y) => nueva("frente", x, y)} onMarker={(mid) => { const i = suyas.find((s) => s.id === mid); if (i) editar(i); }} />
                <BodyMap side="espalda" markers={marcas("espalda")} onTap={(x, y) => nueva("espalda", x, y)} onMarker={(mid) => { const i = suyas.find((s) => s.id === mid); if (i) editar(i); }} />
              </div>

              <div className="mt-5 grid max-w-xs grid-cols-2 gap-2 rounded-2xl border-2 border-ink bg-paper p-1">
                {(["activas", "historial"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`rounded-xl py-2 text-sm font-semibold ${tab === t ? "bg-ink text-lime" : "text-ink/70 hover:bg-ink/5"}`}>
                    {t === "activas" ? `Activas (${activas.length})` : `Historial (${suyas.length})`}
                  </button>
                ))}
              </div>

              {lista.length === 0 ? (
                <p className="mt-4 text-sm text-ink/60">{tab === "activas" ? "No tiene lesiones activas." : "No tiene lesiones anotadas."}</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {lista.map((i) => {
                    const act = isActive(i, hoy);
                    return (
                      <li key={i.id} className={`rounded-xl border-2 p-3 ${act ? "border-pa-red/60 bg-pa-red/5" : "border-ink/15 bg-paper"}`}>
                        <div className="flex flex-wrap items-start gap-3">
                          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-paper ${act ? "bg-pa-red" : "bg-ink/45"}`}>{numero.get(i.id)}</span>
                          <button onClick={() => editar(i)} className="min-w-0 flex-1 text-left">
                            <p className="font-semibold leading-tight">{injuryTypeText(i)} · {zoneText(i.zone, i.laterality)}</p>
                            <p className="text-xs text-ink/60">
                              Desde el {formatDayEs(i.injured_on)}
                              {act
                                ? ` · ${daysOut(i, hoy)} días de baja${i.expected_return ? ` · alta prevista ${formatDayEs(i.expected_return)}` : ""}`
                                : ` · alta el ${formatDayEs(i.returned_on!)} · ${daysOut(i, hoy)} días de baja`}
                            </p>
                            {i.description && <p className="mt-1 text-sm text-ink/75">{i.description}</p>}
                          </button>
                          {act && (
                            <button onClick={() => { if (confirm(`¿Dar de alta a ${player.full_name} hoy?`)) altaMut.mutate(i.id); }}
                              disabled={altaMut.isPending} className="btn-primary !py-1.5 !px-3 !text-sm">
                              Dar de alta
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </section>
      </div>

      {draft && player && (
        <InjuryModal
          playerId={player.id}
          playerName={player.full_name}
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={() => { setDraft(null); refresh(); }}
        />
      )}
    </main>
  );
}

const inputCls = "mt-1 w-full rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2.5 outline-none font-normal";

function InjuryModal({ playerId, playerName, draft, onClose, onSaved }: {
  playerId: string; playerName: string; draft: Draft; onClose: () => void; onSaved: () => void;
}) {
  const [v, setV] = useState<InjuryInput>(draft.value);
  const set = (patch: Partial<InjuryInput>) => setV((prev) => ({ ...prev, ...patch }));
  const [error, setError] = useState("");
  const id = draft.id;

  const saveMut = useMutation({
    mutationFn: () => saveInjury(playerId, v, id),
    onSuccess: () => { toast.success(id ? "Lesión guardada" : "Lesión anotada"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos guardar. Vuelve a intentarlo.")),
  });
  const delMut = useMutation({
    mutationFn: () => deleteInjury(id!),
    onSuccess: () => { toast.success("Lesión borrada"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos borrarla. Vuelve a intentarlo.")),
  });

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); setError(""); saveMut.mutate(); }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl font-bold">{id ? "Lesión" : "Nueva lesión"} · {playerName}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <p className="mt-1 text-xs text-ink/50">
          Marcada en la figura {v.body_side === "frente" ? "de frente" : "de espalda"}. La zona es una sugerencia: cámbiala si no es esa.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-semibold">
          <label>Zona
            <select className={inputCls} value={v.zone} onChange={(e) => set({ zone: e.target.value as Zone })}>
              {ZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
            </select>
          </label>
          <label>Lado
            <select className={inputCls} value={v.laterality} onChange={(e) => set({ laterality: e.target.value as Laterality })}>
              <option value="derecha">Derecho</option>
              <option value="izquierda">Izquierdo</option>
              <option value="centro">Centro / no aplica</option>
            </select>
          </label>
          <label className="sm:col-span-2">Tipo de lesión
            <select className={inputCls} value={v.injury_type} onChange={(e) => set({ injury_type: e.target.value as InjuryType })}>
              {INJURY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.value === "otra" ? "Otra (escríbela tú)" : t.label}</option>)}
            </select>
          </label>
          {v.injury_type === "otra" && (
            <label className="sm:col-span-2">¿Qué lesión es?
              <input className={inputCls} value={v.injury_type_other ?? ""} maxLength={60} autoFocus
                onChange={(e) => set({ injury_type_other: e.target.value })} placeholder="Ej.: pubalgia, fascitis plantar…" />
            </label>
          )}
          <div>Fecha de baja *
            <DateField value={v.injured_on} onChange={(d) => set({ injured_on: d })} ariaLabel="Fecha de baja" className={inputCls} />
          </div>
          <div>Previsión de alta <span className="font-normal text-ink/50">(opcional)</span>
            <DateField value={v.expected_return ?? ""} onChange={(d) => set({ expected_return: d || null })} ariaLabel="Previsión de alta" className={inputCls} />
            {v.expected_return ? (
              <button type="button" onClick={() => set({ expected_return: null })} className="mt-1 text-xs font-semibold underline text-ink/60">
                Quitar la fecha
              </button>
            ) : (
              <span className="mt-1 block text-xs font-normal text-ink/50">Déjala vacía si todavía no se sabe.</span>
            )}
          </div>
          {id && (
            <div className="sm:col-span-2">Alta (cuando ya puede jugar)
              <DateField value={v.returned_on ?? ""} onChange={(d) => set({ returned_on: d || null })} ariaLabel="Fecha de alta" className={inputCls} />
              {v.returned_on && (
                <button type="button" onClick={() => set({ returned_on: null })} className="mt-1 text-xs font-semibold underline text-ink/60">
                  Quitar el alta (sigue lesionada)
                </button>
              )}
            </div>
          )}
          <label className="sm:col-span-2">Qué pasó (opcional)
            <textarea className={`${inputCls} resize-none`} rows={3} maxLength={300} value={v.description ?? ""} onChange={(e) => set({ description: e.target.value })}
              placeholder="Se dobló el tobillo en el entreno del martes." />
          </label>
        </div>

        {error && <p className="mt-3 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button type="submit" disabled={saveMut.isPending} className="btn-primary">{saveMut.isPending ? "Guardando…" : "Guardar"}</button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          {id && (
            <button type="button" disabled={delMut.isPending}
              onClick={() => { if (confirm("¿Borrar esta lesión del historial?")) delMut.mutate(); }}
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-pa-red">
              <Trash2 size={14} /> Borrar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
