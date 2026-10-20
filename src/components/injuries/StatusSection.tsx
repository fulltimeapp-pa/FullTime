import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { DateField, formatDayEs } from "@/components/ui/date-field";
import {
  STATUS_ICON, STATUS_LABEL, clearStatus, deleteStatus, isStatusActive, saveStatus, statusText,
  type PlayerStatus, type StatusInput, type StatusKind,
} from "@/lib/estados";

const inputCls = "mt-1 w-full rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2.5 outline-none font-normal";

/** En la ficha de la jugadora (pantalla de Lesiones): marcarla en duda o sancionada, y quitarlo. */
export function StatusSection({ playerId, playerName, statuses, hoy, onChanged }: {
  playerId: string; playerName: string; statuses: PlayerStatus[]; hoy: string; onChanged: () => void;
}) {
  const [draft, setDraft] = useState<{ id?: string; value: StatusInput } | null>(null);
  const activos = statuses.filter((s) => isStatusActive(s, hoy));
  const pasados = statuses.filter((s) => !isStatusActive(s, hoy));

  const clearMut = useMutation({
    mutationFn: (s: PlayerStatus) => clearStatus(s, hoy),
    onSuccess: () => { toast.success("Listo. Ya está disponible."); onChanged(); },
    onError: (e) => toast.error(friendlyError(e, "No pudimos guardarlo. Vuelve a intentarlo.")),
  });

  const nuevo = (status: StatusKind) => setDraft({ value: { status, note: "", matches: status === "sancionada" ? 1 : null, since: hoy, until: null } });
  const editar = (s: PlayerStatus) => setDraft({ id: s.id, value: { status: s.status, note: s.note ?? "", matches: s.matches, since: s.since, until: s.until } });

  return (
    <div className="mt-6 border-t-2 border-ink/10 pt-5">
      <h3 className="font-display text-lg font-bold">En duda o sancionada</h3>
      <p className="text-sm text-ink/60">Si la convocas, te sale el aviso. Se puede convocar igual: tú decides.</p>

      {activos.length > 0 && (
        <ul className="mt-3 space-y-2">
          {activos.map((s) => (
            <li key={s.id} className={`flex flex-wrap items-start gap-3 rounded-xl border-2 p-3 ${s.status === "sancionada" ? "border-pa-red/60 bg-pa-red/5" : "border-ink/30 bg-paper"}`}>
              <span className="text-lg leading-none">{STATUS_ICON[s.status]}</span>
              <button type="button" onClick={() => editar(s)} className="min-w-0 flex-1 text-left">
                <p className="font-semibold leading-tight">{statusText(s)}</p>
                <p className="text-xs text-ink/60">Desde el {formatDayEs(s.since)}</p>
                {s.note && <p className="mt-1 text-sm text-ink/75">{s.note}</p>}
              </button>
              <button type="button" disabled={clearMut.isPending} onClick={() => clearMut.mutate(s)} className="btn-primary w-full !py-1.5 !px-3 !text-sm sm:w-auto">
                Ya está disponible
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => nuevo("duda")} className="rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm font-semibold hover:bg-lime/40">
          {STATUS_ICON.duda} Marcar en duda
        </button>
        <button type="button" onClick={() => nuevo("sancionada")} className="rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm font-semibold hover:bg-lime/40">
          {STATUS_ICON.sancionada} Marcar sancionada
        </button>
      </div>

      {pasados.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-semibold text-ink/60">Antes ({pasados.length})</summary>
          <ul className="mt-2 space-y-1 text-ink/60">
            {pasados.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => editar(s)} className="text-left hover:underline">
                  {STATUS_LABEL[s.status]} · {formatDayEs(s.since)}
                  {s.cleared_on ? ` al ${formatDayEs(s.cleared_on)}` : s.until ? ` al ${formatDayEs(s.until)}` : ""}
                  {s.note ? ` · ${s.note}` : ""}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {draft && (
        <StatusModal playerId={playerId} playerName={playerName} draft={draft} onClose={() => setDraft(null)} onSaved={() => { setDraft(null); onChanged(); }} />
      )}
    </div>
  );
}

/** Para la hoja del partido: al anotar una roja, ofrece marcarla sancionada (1 partido). */
export async function sancionarPorRoja(playerId: string, hoy: string, rival: string | null): Promise<void> {
  await saveStatus(playerId, { status: "sancionada", matches: 1, since: hoy, until: null, note: `Roja${rival ? ` contra ${rival}` : ""}` });
}

function StatusModal({ playerId, playerName, draft, onClose, onSaved }: {
  playerId: string; playerName: string; draft: { id?: string; value: StatusInput }; onClose: () => void; onSaved: () => void;
}) {
  const [v, setV] = useState<StatusInput>(draft.value);
  const set = (patch: Partial<StatusInput>) => setV((prev) => ({ ...prev, ...patch }));
  const [error, setError] = useState("");
  const id = draft.id;

  const saveMut = useMutation({
    mutationFn: () => saveStatus(playerId, v, id),
    onSuccess: () => { toast.success(`${playerName}: ${STATUS_LABEL[v.status].toLowerCase()}`); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos guardar. Vuelve a intentarlo.")),
  });
  const delMut = useMutation({
    mutationFn: () => deleteStatus(id!),
    onSuccess: () => { toast.success("Borrado"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos borrarlo. Vuelve a intentarlo.")),
  });

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); setError(""); saveMut.mutate(); }}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl font-bold">{playerName}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border-2 border-ink bg-card p-1">
          {(["duda", "sancionada"] as StatusKind[]).map((k) => (
            <button key={k} type="button" onClick={() => set({ status: k, matches: k === "sancionada" ? v.matches ?? 1 : null })}
              className={`rounded-xl py-2.5 text-sm font-semibold ${v.status === k ? "bg-ink text-lime" : "text-ink/70 hover:bg-ink/5"}`}>
              {STATUS_ICON[k]} {STATUS_LABEL[k]}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm font-semibold sm:grid-cols-2">
          {v.status === "sancionada" && (
            <label className="sm:col-span-2">¿Cuántos partidos de sanción?
              <input type="number" inputMode="numeric" min={1} max={30} className={inputCls} value={v.matches ?? ""}
                onChange={(e) => set({ matches: e.target.value === "" ? null : Number(e.target.value) })} placeholder="Déjalo vacío si no se sabe" />
              <span className="mt-1 block text-xs font-normal text-ink/50">Cuando ya pueda jugar, toca "Ya está disponible".</span>
            </label>
          )}
          <div>Desde
            <DateField value={v.since} onChange={(d) => set({ since: d })} ariaLabel="Desde" className={inputCls} />
          </div>
          <div>Hasta <span className="font-normal text-ink/50">(opcional)</span>
            <DateField value={v.until ?? ""} onChange={(d) => set({ until: d || null })} ariaLabel="Hasta" className={inputCls} />
            {v.until ? (
              <button type="button" onClick={() => set({ until: null })} className="mt-1 text-xs font-semibold underline text-ink/60">Quitar la fecha</button>
            ) : (
              <span className="mt-1 block text-xs font-normal text-ink/50">Pasada la fecha, se quita sola.</span>
            )}
          </div>
          <label className="sm:col-span-2">Motivo (opcional)
            <input className={inputCls} maxLength={200} value={v.note ?? ""} onChange={(e) => set({ note: e.target.value })}
              placeholder={v.status === "duda" ? "Molestia en el tobillo, gripe, viaje…" : "Roja contra Origen, 5 amarillas…"} />
            <span className="mt-1 block text-xs font-normal text-ink/50">Lo ven el cuerpo técnico de su categoría y ella. Sus compañeras no.</span>
          </label>
        </div>

        {error && <p className="mt-3 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button type="submit" disabled={saveMut.isPending} className="btn-primary">{saveMut.isPending ? "Guardando…" : "Guardar"}</button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          {id && (
            <button type="button" disabled={delMut.isPending}
              onClick={() => { if (confirm("¿Borrar esto del historial?")) delMut.mutate(); }}
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-pa-red">
              <Trash2 size={14} /> Borrar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
