import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Phone, Plus, Trash2, X } from "lucide-react";
import { HqHeader } from "@/components/hq/HqShell";
import { DateField, formatDayEs } from "@/components/ui/date-field";
import { friendlyError } from "@/lib/errors";
import {
  CONV_CHANNELS, CONV_STATUS, daysFromToday, deleteConversation, deleteTemplate, listConversations, listProspects,
  listTemplates, saveConversation, saveTemplate, setConversationStatus, todayPA,
  type ConvChannel, type ConvStatus, type HqConversation, type HqConversationInput, type HqTemplate, type Prospect,
} from "@/lib/hq";

type Tab = "conversaciones" | "plantillas";

export const Route = createFileRoute("/_authenticated/hq/inbox")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => ({
    tab: s.tab === "plantillas" ? "plantillas" : undefined,
  }),
  component: HqInbox,
});

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success("Mensaje copiado. Cambia lo que está entre [corchetes].");
  } catch {
    toast.error("No pudimos copiar. Selecciona el texto y cópialo a mano.");
  }
}

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 8 ? `507${digits}` : digits}`;
}

const label = <T extends string>(list: { value: T; label: string }[], v: T) => list.find((x) => x.value === v)?.label ?? v;

function HqInbox() {
  const { tab = "conversaciones" } = Route.useSearch();

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:py-10">
      <HqHeader title="Inbox" subtitle="Tus conversaciones abiertas y tus mensajes listos para copiar." />

      <div className="mt-6 grid max-w-md grid-cols-2 gap-2 rounded-2xl border-2 border-ink bg-card p-1">
        {(["conversaciones", "plantillas"] as Tab[]).map((t) => (
          <Link
            key={t}
            to="/hq/inbox"
            search={{ tab: t === "plantillas" ? "plantillas" : undefined }}
            replace
            className={`rounded-xl py-2.5 text-center text-sm font-semibold transition-colors ${tab === t ? "bg-ink text-lime" : "text-ink/70 hover:bg-ink/5"}`}
          >
            {t === "conversaciones" ? "Conversaciones" : "Plantillas"}
          </Link>
        ))}
      </div>

      {tab === "conversaciones" ? <Conversaciones /> : <Plantillas />}
    </div>
  );
}

/* ───────────── Conversaciones ───────────── */

const EMPTY_CONV = (): HqConversationInput => ({
  person: "", channel: "whatsapp", status: "me_toca", summary: "", last_contact: todayPA(), prospect_id: null,
});

function Conversaciones() {
  const qc = useQueryClient();
  const convQ = useQuery({ queryKey: ["hq-conversations"], queryFn: listConversations });
  const prospectsQ = useQuery({ queryKey: ["hq-prospects"], queryFn: listProspects });
  const prospects = prospectsQ.data ?? [];
  const [editing, setEditing] = useState<{ id?: string; value: HqConversationInput } | null>(null);
  const [verCerradas, setVerCerradas] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["hq-conversations"] });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ConvStatus }) => setConversationStatus(id, status),
    onSuccess: refresh,
    onError: (e) => toast.error(friendlyError(e, "No pudimos cambiarla. Vuelve a intentarlo.")),
  });

  const all = convQ.data ?? [];
  const meToca = all.filter((c) => c.status === "me_toca");
  // Las que llevan más tiempo esperando, primero.
  const esperando = all.filter((c) => c.status === "esperando").reverse();
  const cerradas = all.filter((c) => c.status === "cerrada");

  const row = (c: HqConversation) => {
    const p = prospects.find((x) => x.id === c.prospect_id);
    const dias = -daysFromToday(c.last_contact);
    return (
      <li key={c.id} className="rounded-2xl border-2 border-ink bg-card p-4">
        <button
          onClick={() => setEditing({ id: c.id, value: toConvInput(c) })}
          className="block w-full text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg font-bold leading-tight">{c.person}</p>
            <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-semibold">{label(CONV_CHANNELS, c.channel)}</span>
            {p && <span className="rounded-full bg-lime/50 px-2 py-0.5 text-[11px] font-semibold">CRM: {p.name}</span>}
          </div>
          {c.summary && <p className="mt-1 text-sm text-ink/70">{c.summary}</p>}
          <p className={`mt-1 text-xs font-semibold ${c.status === "esperando" && dias >= 3 ? "text-pa-red" : "text-ink/50"}`}>
            {c.status === "esperando"
              ? dias <= 0 ? "Le escribiste hoy" : `Esperando hace ${dias} ${dias === 1 ? "día" : "días"}${dias >= 3 ? " · mándale un seguimiento" : ""}`
              : `Último contacto: ${formatDayEs(c.last_contact)}`}
          </p>
        </button>
        <div className="mt-3 flex flex-wrap gap-2">
          {c.status === "me_toca" && (
            <button onClick={() => statusMut.mutate({ id: c.id, status: "esperando" })} className="btn-primary !py-1.5 !px-3 !text-sm">
              Ya le respondí
            </button>
          )}
          {c.status === "esperando" && (
            <button onClick={() => statusMut.mutate({ id: c.id, status: "me_toca" })} className="btn-primary !py-1.5 !px-3 !text-sm">
              Me respondió
            </button>
          )}
          {c.status !== "cerrada" ? (
            <button onClick={() => statusMut.mutate({ id: c.id, status: "cerrada" })} className="btn-ghost !py-1.5 !px-3 !text-sm">
              Cerrar
            </button>
          ) : (
            <button onClick={() => statusMut.mutate({ id: c.id, status: "me_toca" })} className="btn-ghost !py-1.5 !px-3 !text-sm">
              Reabrir
            </button>
          )}
          {p?.phone && (
            <a href={waLink(p.phone)} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-lime/30">
              <Phone size={14} /> WhatsApp
            </a>
          )}
        </div>
      </li>
    );
  };

  return (
    <>
      <div className="mt-6 flex justify-end">
        <button onClick={() => setEditing({ value: EMPTY_CONV() })} className="btn-primary !py-2.5">
          <Plus size={16} /> Nueva conversación
        </button>
      </div>

      {convQ.isError && (
        <p className="mt-4 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          No pudimos cargar tus conversaciones. Recarga la página.
        </p>
      )}

      {convQ.isLoading ? (
        <p className="mt-6 text-sm text-ink/50">Cargando…</p>
      ) : meToca.length + esperando.length === 0 ? (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-ink/20 bg-paper p-6 text-center text-sm text-ink/60">
          No tienes conversaciones abiertas. Cuando alguien comente o te escriba, anótala aquí.
        </p>
      ) : (
        <>
          {meToca.length > 0 && (
            <section className="mt-6">
              <h2 className="font-display text-xl font-bold">Me toca a mí <span className="font-mono text-xs text-ink/50">{meToca.length}</span></h2>
              <ul className="mt-2 space-y-2">{meToca.map(row)}</ul>
            </section>
          )}
          {esperando.length > 0 && (
            <section className="mt-6">
              <h2 className="font-display text-xl font-bold">Esperando respuesta <span className="font-mono text-xs text-ink/50">{esperando.length}</span></h2>
              <ul className="mt-2 space-y-2">{esperando.map(row)}</ul>
            </section>
          )}
        </>
      )}

      {cerradas.length > 0 && (
        <section className="mt-8">
          <button onClick={() => setVerCerradas((v) => !v)} className="text-sm font-semibold underline">
            {verCerradas ? "Ocultar cerradas" : `Ver cerradas (${cerradas.length})`}
          </button>
          {verCerradas && <ul className="mt-2 space-y-2">{cerradas.map(row)}</ul>}
        </section>
      )}

      {editing && (
        <ConvModal
          id={editing.id}
          initial={editing.value}
          prospects={prospects}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </>
  );
}

function toConvInput(c: HqConversation): HqConversationInput {
  return {
    person: c.person, channel: c.channel, status: c.status, summary: c.summary ?? "",
    last_contact: c.last_contact, prospect_id: c.prospect_id,
  };
}

const inputCls = "mt-1 w-full rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2.5 outline-none font-normal";

function ConvModal({ id, initial, prospects, onClose, onSaved }: {
  id?: string; initial: HqConversationInput; prospects: Prospect[]; onClose: () => void; onSaved: () => void;
}) {
  const [v, setV] = useState<HqConversationInput>(initial);
  const set = (patch: Partial<HqConversationInput>) => setV((prev) => ({ ...prev, ...patch }));
  const [error, setError] = useState("");

  const pickProspect = (pid: string) => {
    const p = prospects.find((x) => x.id === pid);
    set({ prospect_id: pid || null, ...(p && !v.person ? { person: p.name } : {}) });
  };

  const saveMut = useMutation({
    mutationFn: () => saveConversation(v, id),
    onSuccess: () => { toast.success(id ? "Conversación guardada" : "Conversación anotada"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos guardar. Vuelve a intentarlo.")),
  });
  const delMut = useMutation({
    mutationFn: () => deleteConversation(id!),
    onSuccess: () => { toast.success("Conversación borrada"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos borrarla. Vuelve a intentarlo.")),
  });

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); setError(""); saveMut.mutate(); }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{id ? "Conversación" : "Nueva conversación"}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-semibold">
          <label className="sm:col-span-2">Prospecto del CRM
            <select className={inputCls} value={v.prospect_id ?? ""} onChange={(e) => pickProspect(e.target.value)}>
              <option value="">Ninguno</option>
              {prospects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.team ? ` · ${p.team}` : ""}</option>)}
            </select>
          </label>
          <label>Con quién *
            <input className={inputCls} value={v.person} onChange={(e) => set({ person: e.target.value })} placeholder="@academiafenix" autoFocus={!id} />
          </label>
          <label>Por dónde
            <select className={inputCls} value={v.channel} onChange={(e) => set({ channel: e.target.value as ConvChannel })}>
              {CONV_CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label>A quién le toca
            <select className={inputCls} value={v.status} onChange={(e) => set({ status: e.target.value as ConvStatus })}>
              {CONV_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <div>Último contacto
            <DateField value={v.last_contact} onChange={(d) => set({ last_contact: d })} ariaLabel="Último contacto" className={inputCls} />
          </div>
          <label className="sm:col-span-2">Qué pasó
            <textarea className={`${inputCls} resize-none`} rows={3} value={v.summary ?? ""} onChange={(e) => set({ summary: e.target.value })}
              placeholder="Comentó en el Post 11 que maneja 40 jugadoras. Le pregunté cómo las organiza." />
          </label>
        </div>

        {error && <p className="mt-3 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button type="submit" disabled={saveMut.isPending} className="btn-primary">
            {saveMut.isPending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          {id && (
            <button
              type="button" disabled={delMut.isPending}
              onClick={() => { if (confirm("¿Borrar esta conversación?")) delMut.mutate(); }}
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

/* ───────────── Plantillas ───────────── */

function Plantillas() {
  const qc = useQueryClient();
  const tplQ = useQuery({ queryKey: ["hq-templates"], queryFn: listTemplates });
  const [editing, setEditing] = useState<{ id?: string; name: string; body: string } | null>(null);

  return (
    <>
      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-ink/60">Copia, pega en WhatsApp o Instagram y cambia lo que está entre [corchetes].</p>
        <button onClick={() => setEditing({ name: "", body: "" })} className="btn-primary !py-2.5 shrink-0">
          <Plus size={16} /> Nueva plantilla
        </button>
      </div>

      {tplQ.isError && (
        <p className="mt-4 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          No pudimos cargar tus plantillas. Recarga la página.
        </p>
      )}

      {tplQ.isLoading ? (
        <p className="mt-6 text-sm text-ink/50">Cargando…</p>
      ) : (tplQ.data ?? []).length === 0 ? (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-ink/20 bg-paper p-6 text-center text-sm text-ink/60">
          No tienes plantillas. Crea la primera con "Nueva plantilla".
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(tplQ.data ?? []).map((t: HqTemplate) => (
            <div key={t.id} className="flex flex-col rounded-2xl border-2 border-ink bg-card p-4">
              <p className="font-display text-lg font-bold leading-tight">{t.name}</p>
              <p className="mt-2 flex-1 whitespace-pre-wrap text-sm text-ink/75">{t.body}</p>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => copiar(t.body)} className="btn-primary !py-1.5 !px-3 !text-sm">
                  <Copy size={14} /> Copiar
                </button>
                <button onClick={() => setEditing({ id: t.id, name: t.name, body: t.body })} className="btn-ghost !py-1.5 !px-3 !text-sm">
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TemplateModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["hq-templates"] }); }}
        />
      )}
    </>
  );
}

function TemplateModal({ initial, onClose, onSaved }: {
  initial: { id?: string; name: string; body: string }; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [body, setBody] = useState(initial.body);
  const [error, setError] = useState("");
  const id = initial.id;

  const saveMut = useMutation({
    mutationFn: () => saveTemplate({ name, body }, id),
    onSuccess: () => { toast.success("Plantilla guardada"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos guardar. Vuelve a intentarlo.")),
  });
  const delMut = useMutation({
    mutationFn: () => deleteTemplate(id!),
    onSuccess: () => { toast.success("Plantilla borrada"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos borrarla. Vuelve a intentarlo.")),
  });

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); setError(""); saveMut.mutate(); }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{id ? "Plantilla" : "Nueva plantilla"}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="mt-4 space-y-3 text-sm font-semibold">
          <label className="block">Nombre *
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Invitar a una demo" autoFocus={!id} />
          </label>
          <label className="block">Mensaje *
            <textarea className={`${inputCls} resize-y`} rows={7} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="¡Hola [nombre]! …" />
          </label>
        </div>

        {error && <p className="mt-3 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button type="submit" disabled={saveMut.isPending} className="btn-primary">
            {saveMut.isPending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          {id && (
            <button
              type="button" disabled={delMut.isPending}
              onClick={() => { if (confirm("¿Borrar esta plantilla?")) delMut.mutate(); }}
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
