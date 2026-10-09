import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2, X } from "lucide-react";
import { HqHeader } from "@/components/hq/HqShell";
import { DateField, formatDayEs } from "@/components/ui/date-field";
import { friendlyError } from "@/lib/errors";
import {
  POST_FORMATS, POST_NETWORKS, POST_STATUS, daysFromToday, deletePost, listPosts, savePost, setPostStatus,
  type HqPost, type HqPostInput, type PostFormat, type PostNetwork, type PostStatus,
} from "@/lib/hq";

export const Route = createFileRoute("/_authenticated/hq/contenido")({
  component: HqContenido,
});

const EMPTY: HqPostInput = {
  title: "", network: "instagram", format: "post", status: "idea", publish_date: null, caption: "", notes: "",
};

const NETWORK_CHIP: Record<PostNetwork, string> = {
  instagram: "bg-pa-red/15 text-pa-red",
  tiktok: "bg-ink text-paper",
  facebook: "bg-ink/10",
  linkedin: "bg-lime/60",
};

const label = <T extends string>(list: { value: T; label: string }[], v: T) => list.find((x) => x.value === v)?.label ?? v;

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success("Texto copiado");
  } catch {
    toast.error("No pudimos copiar. Selecciona el texto y cópialo a mano.");
  }
}

function HqContenido() {
  const qc = useQueryClient();
  const postsQ = useQuery({ queryKey: ["hq-posts"], queryFn: listPosts });
  const [editing, setEditing] = useState<{ id?: string; value: HqPostInput } | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["hq-posts"] });
  const moveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PostStatus }) => setPostStatus(id, status),
    onSuccess: refresh,
    onError: (e) => toast.error(friendlyError(e, "No pudimos moverla. Vuelve a intentarlo.")),
  });

  const all = postsQ.data ?? [];

  return (
    <div className="px-5 py-8 md:py-10">
      <HqHeader
        title="Contenido"
        subtitle="Tus publicaciones, desde la idea hasta que salen."
        action={
          <button onClick={() => setEditing({ value: { ...EMPTY } })} className="btn-primary !py-2.5">
            <Plus size={16} /> Nueva publicación
          </button>
        }
      />

      {postsQ.isError && (
        <p className="mt-6 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          No pudimos cargar tu contenido. Recarga la página.
        </p>
      )}

      <div className="mt-6 flex gap-4 overflow-x-auto pb-4 snap-x">
        {POST_STATUS.map((st, si) => {
          let items = all.filter((p) => p.status === st.value);
          // Publicadas: las más recientes primero.
          if (st.value === "publicada") items = [...items].reverse();
          return (
            <section key={st.value} className="w-72 shrink-0 snap-start">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-display text-lg font-bold">{st.label}</h2>
                <span className="font-mono text-xs text-ink/50">{items.length}</span>
              </div>
              <div className="mt-2 min-h-24 space-y-2 rounded-2xl bg-ink/5 p-2">
                {postsQ.isLoading ? (
                  <p className="p-3 text-sm text-ink/40">Cargando…</p>
                ) : items.length === 0 ? (
                  <p className="p-3 text-sm text-ink/40">Nada aquí.</p>
                ) : (
                  items.map((p) => {
                    const late = p.publish_date && p.status !== "publicada" && daysFromToday(p.publish_date) < 0;
                    return (
                      <div key={p.id} className="rounded-xl border-2 border-ink bg-card p-3">
                        <button onClick={() => setEditing({ id: p.id, value: toInput(p) })} className="block w-full text-left">
                          <div className="flex flex-wrap gap-1">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${NETWORK_CHIP[p.network]}`}>{label(POST_NETWORKS, p.network)}</span>
                            <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-semibold border border-ink/20">{label(POST_FORMATS, p.format)}</span>
                          </div>
                          <p className="mt-1.5 font-semibold leading-tight">{p.title}</p>
                          {p.publish_date && (
                            <p className={`mt-1 text-xs font-semibold ${late ? "text-pa-red" : "text-ink/55"}`}>
                              {formatDayEs(p.publish_date)}{late ? " · ya pasó la fecha" : ""}
                            </p>
                          )}
                        </button>
                        <div className="mt-2 flex items-center gap-1">
                          <button
                            onClick={() => moveMut.mutate({ id: p.id, status: POST_STATUS[si - 1].value })}
                            disabled={si === 0 || moveMut.isPending} aria-label={si > 0 ? `Pasar a ${POST_STATUS[si - 1].label}` : "Atrás"}
                            className="grid h-7 w-7 place-items-center rounded-lg border-2 border-ink/20 hover:border-ink disabled:opacity-20"
                          >
                            <ChevronLeft size={15} />
                          </button>
                          <button
                            onClick={() => moveMut.mutate({ id: p.id, status: POST_STATUS[si + 1].value })}
                            disabled={si === POST_STATUS.length - 1 || moveMut.isPending}
                            className="inline-flex h-7 items-center gap-0.5 rounded-lg border-2 border-ink/20 px-2 text-xs font-semibold hover:border-ink disabled:opacity-20"
                          >
                            {si < POST_STATUS.length - 1 ? POST_STATUS[si + 1].label : "Listo"} <ChevronRight size={14} />
                          </button>
                          {p.caption && (
                            <button onClick={() => copiar(p.caption!)} aria-label="Copiar texto" className="ml-auto grid h-7 w-7 place-items-center rounded-lg border-2 border-ink/20 hover:border-ink">
                              <Copy size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      {editing && (
        <PostModal
          id={editing.id}
          initial={editing.value}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function toInput(p: HqPost): HqPostInput {
  return {
    title: p.title, network: p.network, format: p.format, status: p.status, publish_date: p.publish_date,
    caption: p.caption ?? "", notes: p.notes ?? "",
  };
}

const inputCls = "mt-1 w-full rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2.5 outline-none font-normal";

function PostModal({ id, initial, onClose, onSaved }: {
  id?: string; initial: HqPostInput; onClose: () => void; onSaved: () => void;
}) {
  const [v, setV] = useState<HqPostInput>(initial);
  const set = (patch: Partial<HqPostInput>) => setV((prev) => ({ ...prev, ...patch }));
  const [error, setError] = useState("");

  const saveMut = useMutation({
    mutationFn: () => savePost(v, id),
    onSuccess: () => { toast.success(id ? "Publicación guardada" : "Publicación agregada"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos guardar. Vuelve a intentarlo.")),
  });
  const delMut = useMutation({
    mutationFn: () => deletePost(id!),
    onSuccess: () => { toast.success("Publicación borrada"); onSaved(); },
    onError: (e) => setError(friendlyError(e, "No pudimos borrarla. Vuelve a intentarlo.")),
  });

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); setError(""); saveMut.mutate(); }}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)]"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{id ? "Publicación" : "Nueva publicación"}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-semibold">
          <label className="sm:col-span-2">Idea *
            <input className={inputCls} value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="Cómo saber quién viene al partido" autoFocus={!id} />
          </label>
          <label>Red
            <select className={inputCls} value={v.network} onChange={(e) => set({ network: e.target.value as PostNetwork })}>
              {POST_NETWORKS.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </label>
          <label>Formato
            <select className={inputCls} value={v.format} onChange={(e) => set({ format: e.target.value as PostFormat })}>
              {POST_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
          <label>Estado
            <select className={inputCls} value={v.status} onChange={(e) => set({ status: e.target.value as PostStatus })}>
              {POST_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <div>Fecha en que sale
            <DateField value={v.publish_date ?? ""} onChange={(d) => set({ publish_date: d || null })} ariaLabel="Fecha en que sale" className={inputCls} />
          </div>
          <label className="sm:col-span-2">
            <span className="flex items-center justify-between">
              Texto (copy)
              {v.caption && (
                <button type="button" onClick={() => copiar(v.caption!)} className="inline-flex items-center gap-1 text-xs font-semibold underline">
                  <Copy size={12} /> Copiar
                </button>
              )}
            </span>
            <textarea className={`${inputCls} resize-y`} rows={5} value={v.caption ?? ""} onChange={(e) => set({ caption: e.target.value })}
              placeholder={"¿Sigues confirmando el partido por WhatsApp? 😅\nCon FullTime sabes quién viene…"} />
          </label>
          <label className="sm:col-span-2">Notas
            <input className={inputCls} value={v.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Archivo: 01 - POR PUBLICAR/reel-convocatoria.mp4" />
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
              onClick={() => { if (confirm("¿Borrar esta publicación?")) delMut.mutate(); }}
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
