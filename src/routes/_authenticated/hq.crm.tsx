import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Phone, Plus, Trash2, X } from "lucide-react";
import { HqHeader } from "@/components/hq/HqShell";
import { DateField, formatDayEs } from "@/components/ui/date-field";
import { friendlyError } from "@/lib/errors";
import {
  STAGES, daysFromToday, deleteProspect, listClubs, listMeetings, listProspects, saveProspect,
  type Prospect, type ProspectInput, type ProspectStage,
} from "@/lib/hq";

export const Route = createFileRoute("/_authenticated/hq/crm")({
  component: HqCrm,
});

const EMPTY: ProspectInput = {
  name: "", team: "", phone: "", email: "", stage: "contacto",
  next_step: "", next_date: null, notes: "", club_id: null,
};

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 8 ? `507${digits}` : digits}`;
}

function HqCrm() {
  const qc = useQueryClient();
  const prospectsQ = useQuery({ queryKey: ["hq-prospects"], queryFn: listProspects });
  const clubsQ = useQuery({ queryKey: ["hq-clubs"], queryFn: listClubs });
  const [editing, setEditing] = useState<{ id?: string; value: ProspectInput } | null>(null);

  const prospects = prospectsQ.data ?? [];

  return (
    <div className="px-5 py-8 md:py-10">
      <HqHeader
        title="CRM"
        subtitle="Tus prospectos por etapa, desde el primer contacto hasta que pagan."
        action={
          <button onClick={() => setEditing({ value: { ...EMPTY } })} className="btn-primary !py-2.5">
            <Plus size={16} /> Nuevo prospecto
          </button>
        }
      />

      {prospectsQ.isError && (
        <p className="mt-6 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          No pudimos cargar tus prospectos. Recarga la página.
        </p>
      )}

      <div className="mt-6 flex gap-4 overflow-x-auto pb-4 snap-x">
        {STAGES.map((st) => {
          const items = prospects.filter((p) => p.stage === st.value);
          return (
            <section key={st.value} className="w-72 shrink-0 snap-start">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-display text-lg font-bold">{st.label}</h2>
                <span className="font-mono text-xs text-ink/50">{items.length}</span>
              </div>
              <div className="mt-2 min-h-24 space-y-2 rounded-2xl bg-ink/5 p-2">
                {prospectsQ.isLoading ? (
                  <p className="p-3 text-sm text-ink/40">Cargando…</p>
                ) : items.length === 0 ? (
                  <p className="p-3 text-sm text-ink/40">Nadie aquí.</p>
                ) : (
                  items.map((p) => <ProspectCard key={p.id} p={p} onOpen={() => setEditing({ id: p.id, value: toInput(p) })} />)
                )}
              </div>
            </section>
          );
        })}
      </div>

      {editing && (
        <ProspectModal
          initial={editing.value}
          id={editing.id}
          clubs={(clubsQ.data ?? []).map((c) => ({ id: c.club_id, name: c.club_name }))}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["hq-prospects"] });
          }}
        />
      )}
    </div>
  );
}

function toInput(p: Prospect): ProspectInput {
  return {
    name: p.name, team: p.team ?? "", phone: p.phone ?? "", email: p.email ?? "", stage: p.stage,
    next_step: p.next_step ?? "", next_date: p.next_date, notes: p.notes ?? "", club_id: p.club_id,
  };
}

function ProspectCard({ p, onOpen }: { p: Prospect; onOpen: () => void }) {
  const d = p.next_date ? daysFromToday(p.next_date) : null;
  const late = d !== null && d < 0 && p.stage !== "pagando" && p.stage !== "perdido";
  return (
    <button onClick={onOpen} className="w-full text-left rounded-xl border-2 border-ink bg-card p-3 hover:shadow-[3px_3px_0_0_var(--color-ink)] transition-shadow">
      <p className="font-semibold leading-tight">{p.name}</p>
      {p.team && <p className="text-xs text-ink/60">{p.team}</p>}
      {(p.next_step || p.next_date) && (
        <p className={`mt-2 text-xs font-semibold ${late ? "text-pa-red" : "text-ink/70"}`}>
          {p.next_step || "Seguimiento"}
          {p.next_date && ` · ${d === 0 ? "hoy" : d === 1 ? "mañana" : formatDayEs(p.next_date)}`}
          {late && " · atrasado"}
        </p>
      )}
      {p.phone && (
        <a
          href={waLink(p.phone)} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline"
        >
          <Phone size={12} /> WhatsApp
        </a>
      )}
    </button>
  );
}

/** Reuniones anotadas con este prospecto (las más recientes primero). */
function ProspectMeetings({ prospectId }: { prospectId: string }) {
  const q = useQuery({ queryKey: ["hq-meetings", prospectId], queryFn: () => listMeetings(prospectId) });
  const items = q.data ?? [];
  return (
    <div className="mt-4 rounded-xl border-2 border-ink/15 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Reuniones</p>
        <Link to="/hq/reuniones" search={{ prospecto: prospectId }} className="text-sm font-semibold underline">
          + Anotar reunión
        </Link>
      </div>
      {q.isLoading ? (
        <p className="mt-2 text-sm text-ink/50">Cargando…</p>
      ) : q.isError ? (
        <p className="mt-2 text-sm text-pa-red">No pudimos cargar sus reuniones.</p>
      ) : items.length === 0 ? (
        <p className="mt-2 text-sm text-ink/50">Todavía no hay reuniones con esta persona.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((m) => (
            <li key={m.id} className="text-sm">
              <span className="font-mono text-xs text-ink/50">{formatDayEs(m.meeting_date)}</span>{" "}
              <span className="font-semibold">{m.title}</span>
              {m.next_steps && <p className="text-ink/70">Sigue: {m.next_steps}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const inputCls = "mt-1 w-full rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2.5 outline-none";

function ProspectModal({ initial, id, clubs, onClose, onSaved }: {
  initial: ProspectInput; id?: string; clubs: { id: string; name: string }[];
  onClose: () => void; onSaved: () => void;
}) {
  const [v, setV] = useState<ProspectInput>(initial);
  const [error, setError] = useState("");
  const set = (patch: Partial<ProspectInput>) => setV((prev) => ({ ...prev, ...patch }));

  const saveMut = useMutation({
    mutationFn: () => saveProspect(v, id),
    onSuccess: () => { toast.success(id ? "Prospecto guardado" : "Prospecto agregado"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos guardar. Vuelve a intentarlo.")),
  });
  const delMut = useMutation({
    mutationFn: () => deleteProspect(id!),
    onSuccess: () => { toast.success("Prospecto borrado"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos borrarlo. Vuelve a intentarlo.")),
  });

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); setError(""); saveMut.mutate(); }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{id ? "Prospecto" : "Nuevo prospecto"}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-semibold">
          <label className="sm:col-span-2">Nombre del contacto *
            <input className={inputCls} value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="Juan Pérez" autoFocus />
          </label>
          <label>Equipo / club
            <input className={inputCls} value={v.team ?? ""} onChange={(e) => set({ team: e.target.value })} placeholder="Sub-18 Femenino" />
          </label>
          <label>Etapa
            <select className={inputCls} value={v.stage} onChange={(e) => set({ stage: e.target.value as ProspectStage })}>
              {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label>WhatsApp
            <input className={inputCls} value={v.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} placeholder="6000-0000" inputMode="tel" />
          </label>
          <label>Correo
            <input className={inputCls} value={v.email ?? ""} onChange={(e) => set({ email: e.target.value })} placeholder="correo@ejemplo.com" inputMode="email" />
          </label>
          <label>Próximo paso
            <input className={inputCls} value={v.next_step ?? ""} onChange={(e) => set({ next_step: e.target.value })} placeholder="Mandarle la guía" />
          </label>
          <div>Para cuándo
            <DateField value={v.next_date ?? ""} onChange={(d) => set({ next_date: d })} ariaLabel="Para cuándo" className={inputCls} />
          </div>
          <label className="sm:col-span-2">Su club en FullTime (cuando se registre)
            <select className={inputCls} value={v.club_id ?? ""} onChange={(e) => set({ club_id: e.target.value || null })}>
              <option value="">Todavía no se registra</option>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">Notas
            <textarea className={`${inputCls} resize-none`} rows={3} value={v.notes ?? ""} onChange={(e) => set({ notes: e.target.value })}
              placeholder="Qué le interesó, qué preguntó, cuántas jugadoras tiene…" />
          </label>
        </div>

        {id && <ProspectMeetings prospectId={id} />}

        {error && <p className="mt-3 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button type="submit" disabled={saveMut.isPending} className="btn-primary">
            {saveMut.isPending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          {id && (
            <button
              type="button" disabled={delMut.isPending}
              onClick={() => { if (confirm(`¿Borrar a ${v.name}?`)) delMut.mutate(); }}
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-pa-red"
            >
              <Trash2 size={14} /> Borrar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
