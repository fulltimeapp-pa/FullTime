import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/panel-fulltime")({
  head: () => ({
    meta: [
      { title: "Panel FullTime · Dueña" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Vista interna de todos los clubes de FullTime para dar soporte concierge.",
      },
    ],
  }),
  component: PanelFullTime,
});

const BASE_URL = "https://fulltime-pa.lovable.app";

type ClubRow = {
  club_id: string;
  club_name: string;
  created_at: string;
  trial_days_left: number;
  admin_name: string | null;
  admin_email: string | null;
  categorias_count: number;
  jugadoras_total: number;
  jugadoras_vinculadas: number;
  jugadoras_pendientes: number;
  staff_count: number;
  notif_activadas: number | null;
  convocatorias_total: number;
  ultima_actividad: string | null;
  estado: "nuevo" | "activo" | "dormido";
  crm_status?: string | null;
  crm_notes?: string | null;
  paid_until?: string | null;
  blocked?: boolean;
};


const CRM_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Sin estado" },
  { value: "nuevo", label: "Nuevo" },
  { value: "contactado", label: "Contactado" },
  { value: "piloto", label: "Piloto activo" },
  { value: "en_riesgo", label: "En riesgo" },
  { value: "convertido", label: "Convertido" },
  { value: "perdido", label: "Perdido" },
];

function crmChipClass(status: string) {
  if (status === "convertido") return "border-ink bg-lime text-ink";
  if (status === "en_riesgo" || status === "perdido") return "border-pa-red bg-pa-red/10 text-pa-red";
  if (status === "contactado" || status === "piloto") return "border-ink bg-ink/5 text-ink";
  return "border-ink/30 bg-paper text-ink/60";
}

type PendingPlayer = {
  player_id: string;
  full_name: string;
  email: string | null;
  invite_token: string | null;
  invite_expired: boolean;
};

function dias(n: number) {
  return n === 1 ? "1 día" : `${n} días`;
}

function hace(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return "hoy";
  return `hace ${dias(d)}`;
}

function notifPct(c: ClubRow) {
  if (!c.jugadoras_vinculadas) return 0;
  return Math.round(((c.notif_activadas ?? 0) / c.jugadoras_vinculadas) * 100);
}

function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          /* ignore */
        }
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="rounded-full border-2 border-ink px-3 py-1 text-xs font-semibold text-ink hover:bg-lime transition-colors"
    >
      {done ? "Copiado" : label}
    </button>
  );
}

function EstadoBadge({ estado }: { estado: ClubRow["estado"] }) {
  const map: Record<ClubRow["estado"], string> = {
    nuevo: "border-ink bg-lime text-ink",
    activo: "border-ink bg-paper text-ink",
    dormido: "border-pa-red bg-pa-red/10 text-pa-red",
  };
  return (
    <span className={`rounded-full border-2 px-3 py-0.5 text-xs font-bold uppercase ${map[estado]}`}>
      {estado}
    </span>
  );
}

function AddPlayerForm({ clubId }: { clubId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cats = useQuery({
    queryKey: ["club-categories-admin", clubId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("club_id", clubId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setNewLink(null);
    const { data, error } = await supabase.rpc("add_player_to_club", {
      _club_id: clubId,
      _full_name: name,
      _email: email,
      _category_id: categoryId || undefined,
    });
    setSaving(false);
    if (error) {
      setMsg(`No se pudo agregar: ${error.message}`);
      return;
    }
    const res = data as unknown as {
      ok: boolean;
      reason?: string;
      invite_token?: string;
    };
    if (!res?.ok) {
      const reasons: Record<string, string> = {
        no_category: "Este club aún no tiene categorías. Créale una primero.",
        invalid_email: "Ese correo no parece válido.",
        no_name: "Escribe el nombre de la jugadora.",
      };
      setMsg(reasons[res?.reason ?? ""] ?? "No se pudo agregar.");
      return;
    }
    setNewLink(`${BASE_URL}/unirse/${res.invite_token}`);
    setName("");
    setEmail("");
    void qc.invalidateQueries({ queryKey: ["club-pending-players", clubId] });
    void qc.invalidateQueries({ queryKey: ["platform-overview"] });
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border-2 border-ink bg-paper px-4 py-1.5 text-sm font-bold text-ink hover:bg-lime transition-colors"
      >
        {open ? "Cerrar formulario" : "➕ Agregar jugadora"}
      </button>

      {open && (
        <form
          onSubmit={submit}
          className="mt-3 space-y-2 rounded-xl border-2 border-ink bg-paper p-3"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre y apellido"
            className="w-full rounded-lg border-2 border-ink/20 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full rounded-lg border-2 border-ink/20 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border-2 border-ink/20 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          >
            <option value="">Categoría por defecto (la primera)</option>
            {(cats.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full border-2 border-ink bg-lime px-4 py-1.5 text-sm font-bold text-ink disabled:opacity-60"
          >
            {saving ? "Agregando…" : "Agregar y crear enlace"}
          </button>
          {msg && <p className="text-sm text-pa-red">{msg}</p>}
          {newLink && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-ink bg-lime/40 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-ink">{newLink}</span>
              <CopyButton value={newLink} label="Copiar enlace" />
            </div>
          )}
        </form>
      )}
    </div>
  );
}

function PendingList({ clubId }: { clubId: string }) {
  const qc = useQueryClient();
  const [renewing, setRenewing] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["club-pending-players", clubId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("club_pending_players", { _club_id: clubId });
      if (error) throw error;
      return (data ?? []) as unknown as PendingPlayer[];
    },
  });

  async function renovar(playerId: string) {
    setRenewing(playerId);
    await supabase.rpc("regenerate_player_invite", { _player_id: playerId });
    await qc.invalidateQueries({ queryKey: ["club-pending-players", clubId] });
    setRenewing(null);
  }

  if (isLoading) return <p className="mt-3 text-sm text-ink/60">Cargando jugadoras…</p>;
  if (error) return <p className="mt-3 text-sm text-pa-red">No se pudo cargar: {error.message}</p>;

  const conToken = (data ?? []).filter((p) => p.invite_token);
  const todos = conToken
    .map((p) => `${p.full_name}: ${BASE_URL}/unirse/${p.invite_token}`)
    .join("\n");

  if (!data?.length)
    return (
      <>
        <p className="mt-3 text-sm text-ink/60">Todas las jugadoras ya aceptaron.</p>
        <AddPlayerForm clubId={clubId} />
      </>
    );

  return (
    <>
      {conToken.length > 0 && (
        <div className="mt-3">
          <CopyButton value={todos} label="Copiar TODOS los enlaces" />
        </div>
      )}
      <ul className="mt-3 space-y-2">
        {data.map((p) => (
          <li
            key={p.player_id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-ink/15 bg-paper px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{p.full_name}</p>
              <p className="truncate text-xs text-ink/60">{p.email ?? "sin correo"}</p>
            </div>
            <div className="flex items-center gap-2">
              {p.invite_expired && (
                <span className="text-xs font-bold uppercase text-pa-red">vencido</span>
              )}
              {p.invite_token ? (
                <CopyButton
                  value={`${BASE_URL}/unirse/${p.invite_token}`}
                  label="Copiar enlace de invitación"
                />
              ) : (
                <span className="text-xs text-ink/50">sin enlace</span>
              )}
              <button
                type="button"
                onClick={() => void renovar(p.player_id)}
                disabled={renewing === p.player_id}
                className="rounded-full border-2 border-ink bg-lime px-3 py-1 text-xs font-semibold text-ink disabled:opacity-60"
              >
                {renewing === p.player_id ? "Renovando…" : "Renovar"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <AddPlayerForm clubId={clubId} />
    </>
  );
}


type DetailPlayer = {
  player_id: string;
  full_name: string;
  email: string | null;
  vinculada: boolean;
  invite_expired: boolean;
};
type DetailCallUp = {
  id: string;
  kind: string;
  starts_at: string;
  place: string | null;
  total: number;
  van: number;
  no_van: number;
  sin_responder: number;
};
type DetailStaff = { role: string; email: string | null; name: string | null };
type DetailCategory = {
  category_id: string;
  name: string;
  jugadoras_total: number;
  vinculadas: number;
  pendientes: number;
};
type ClubDetail = {
  categorias?: DetailCategory[];
  jugadoras: DetailPlayer[];
  convocatorias: DetailCallUp[];
  staff: DetailStaff[];
};


const fechaPA = new Intl.DateTimeFormat("es-PA", {
  timeZone: "America/Panama",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function ClubDetailModal({ club, onClose }: { club: ClubRow; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["club-detail", club.club_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("club_detail", { _club_id: club.club_id });
      if (error) throw error;
      return data as unknown as ClubDetail;
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 py-10"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border-2 border-ink bg-paper p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl font-bold text-ink">{club.club_name}</h3>
            <p className="text-xs text-ink/60">Diagnóstico del club</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full border-2 border-ink bg-paper px-3 py-1 text-sm font-bold text-ink hover:bg-lime transition-colors"
          >
            ✕
          </button>
        </div>

        {isLoading && <p className="mt-6 text-sm text-ink/60">Cargando detalle…</p>}
        {error && (
          <p className="mt-6 rounded-xl border-2 border-pa-red bg-pa-red/10 p-3 text-sm text-pa-red">
            No se pudo cargar: {(error as Error).message}
          </p>
        )}

        {data && (
          <div className="mt-5 space-y-6">
            <section>
              <h4 className="font-display text-lg font-bold text-ink">Subdivisiones (categorías)</h4>
              {!data.categorias || data.categorias.length === 0 ? (
                <p className="mt-2 text-sm text-ink/60">Este club no tiene categorías.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {data.categorias.map((c) => (
                    <li
                      key={c.category_id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-ink/15 px-3 py-2"
                    >
                      <span className="text-sm font-semibold text-ink">{c.name}</span>
                      <span className="text-xs text-ink/70">
                        {c.jugadoras_total} jugadoras · {c.vinculadas} aceptaron · {c.pendientes}{" "}
                        pendientes
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h4 className="font-display text-lg font-bold text-ink">Jugadoras</h4>
              {data.jugadoras.length === 0 ? (

                <p className="mt-2 text-sm text-ink/60">Todavía no hay jugadoras.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {data.jugadoras.map((p) => (
                    <li
                      key={p.player_id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-ink/15 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{p.full_name}</p>
                        <p className="truncate text-xs text-ink/60">{p.email ?? "sin correo"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.email && <CopyButton value={p.email} label="Copiar correo" />}
                        <span
                          className={`rounded-full border-2 px-3 py-0.5 text-xs font-bold ${
                            p.vinculada
                              ? "border-ink bg-lime text-ink"
                              : p.invite_expired
                                ? "border-pa-red bg-pa-red/10 text-pa-red"
                                : "border-ink/30 bg-paper text-ink/60"
                          }`}
                        >
                          {p.vinculada ? "Aceptó" : p.invite_expired ? "Vencida" : "Pendiente"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h4 className="font-display text-lg font-bold text-ink">Convocatorias recientes</h4>
              {data.convocatorias.length === 0 ? (
                <p className="mt-2 text-sm text-ink/60">Este club aún no crea convocatorias.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {data.convocatorias.map((c) => {
                    const tasa = c.total
                      ? Math.round(((c.van + c.no_van) / c.total) * 100)
                      : 0;
                    return (
                      <li key={c.id} className="rounded-xl border-2 border-ink/15 px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink">
                            {c.kind === "entreno" ? "Entreno" : "Partido"} ·{" "}
                            {fechaPA.format(new Date(c.starts_at))}
                          </span>
                          <span className="text-xs font-bold text-ink">{tasa}% respondió</span>
                        </div>
                        <p className="text-xs text-ink/60">{c.place ?? "sin lugar"}</p>
                        <p className="mt-1 text-xs text-ink/70">
                          {c.van} van · {c.no_van} no · {c.sin_responder} sin responder
                        </p>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full border-2 border-ink bg-paper">
                          <div className="h-full bg-lime" style={{ width: `${tasa}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section>
              <h4 className="font-display text-lg font-bold text-ink">Cuerpo técnico</h4>
              {data.staff.length === 0 ? (
                <p className="mt-2 text-sm text-ink/60">Sin cuerpo técnico registrado.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {data.staff.map((s, i) => (
                    <li
                      key={`${s.email ?? "x"}-${i}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-ink/15 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {s.name ?? "Sin nombre"}
                        </p>
                        <p className="truncate text-xs text-ink/60">{s.email ?? "sin correo"}</p>
                      </div>
                      <span className="rounded-full border-2 border-ink bg-paper px-3 py-0.5 text-xs font-bold uppercase text-ink">
                        {s.role}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function CrmPanel({ club }: { club: ClubRow }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(club.crm_status ?? "");
  const [notes, setNotes] = useState(club.crm_notes ?? "");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(patch: { status?: string | null; notes?: string | null }) {
    setErr(null);
    const { error } = await supabase.from("club_crm").upsert(
      { club_id: club.club_id, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "club_id" },
    );
    if (error) {
      setErr(error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    void qc.invalidateQueries({ queryKey: ["platform-overview"] });
  }

  return (
    <div className="mt-4 rounded-xl border-2 border-ink/20 bg-paper p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">
          Seguimiento
        </span>
        <select
          value={status}
          onChange={(e) => {
            const v = e.target.value;
            setStatus(v);
            void save({ status: v === "" ? null : v });
          }}
          className="rounded-full border-2 border-ink bg-paper px-3 py-1 text-xs font-semibold text-ink outline-none"
        >
          {CRM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className={`rounded-full border-2 px-3 py-0.5 text-xs font-bold ${crmChipClass(status)}`}>
          {CRM_OPTIONS.find((o) => o.value === status)?.label ?? "Sin estado"}
        </span>
        {saved && <span className="text-xs font-bold text-ink">Guardado</span>}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => {
          if ((club.crm_notes ?? "") !== notes) void save({ notes });
        }}
        rows={3}
        placeholder="Notas: qué hablaron, próximos pasos…"
        className="mt-2 w-full rounded-lg border-2 border-ink/20 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void save({ notes })}
          className="rounded-full border-2 border-ink bg-lime px-4 py-1 text-xs font-bold text-ink"
        >
          Guardar nota
        </button>
        {err && <span className="text-xs text-pa-red">{err}</span>}
      </div>
    </div>
  );
}

function ddmm(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  void y;
  return `${d}/${m}`;
}

function daysUntil(iso: string) {
  const today = new Date();
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - t) / 86400000);
}

function SubStatusChip({ club }: { club: ClubRow }) {
  let label: string;
  let danger = false;

  if (club.blocked) {
    label = "Suspendida";
    danger = true;
  } else if (club.paid_until && daysUntil(club.paid_until) >= 0) {
    const left = daysUntil(club.paid_until);
    label = `Activa hasta ${ddmm(club.paid_until)}`;
    danger = left <= 7;
  } else if (!club.paid_until && club.trial_days_left > 0) {
    label = `Prueba · quedan ${dias(club.trial_days_left)}`;
  } else {
    label = "Vencida";
    danger = true;
  }

  return (
    <span
      className={`rounded-full border-2 px-3 py-0.5 text-xs font-bold ${
        danger ? "border-pa-red bg-pa-red/10 text-pa-red" : "border-ink bg-lime text-ink"
      }`}
    >
      {label}
    </span>
  );
}

type PaymentRow = {
  id: string;
  paid_at: string;
  months: number;
  amount: number | null;
  note: string | null;
};

function PaymentModal({ club, onClose }: { club: ClubRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [months, setMonths] = useState("1");
  const [amount, setAmount] = useState("9.99");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const guardar = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.rpc("record_club_payment" as never, {
      _club_id: club.club_id,
      _months: Number(months),
      _amount: amount === "" ? null : Number(amount),
      _paid_at: paidAt,
      _note: note.trim() || null,
    } as never);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    const res = data as unknown as { ok: boolean; reason?: string; paid_until?: string };
    if (!res?.ok) {
      setErr(res?.reason === "invalid_months" ? "Cantidad de meses inválida." : "No se pudo registrar.");
      return;
    }
    toast.success(`Pago registrado · activa hasta ${ddmm(res.paid_until!)}`);
    qc.invalidateQueries({ queryKey: ["platform-overview"] });
    qc.invalidateQueries({ queryKey: ["platform-kpis"] });
    qc.invalidateQueries({ queryKey: ["club-payments", club.club_id] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-ink bg-paper p-5">
        <h3 className="font-display text-xl font-bold text-ink">Registrar pago · {club.club_name}</h3>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink/60">
          Meses
          <select
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm font-semibold text-ink"
          >
            {["1", "3", "6", "12"].map((m) => (
              <option key={m} value={m}>
                {m} {m === "1" ? "mes" : "meses"}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink/60">
          Monto (US$)
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm font-semibold text-ink"
          />
        </label>

        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink/60">
          Fecha de pago
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm font-semibold text-ink"
          />
        </label>

        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink/60">
          Nota (opcional)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej. Yappy de la profe"
            className="mt-1 w-full rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm text-ink"
          />
        </label>

        {err && <p className="mt-3 text-xs font-semibold text-pa-red">{err}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={guardar}
            disabled={busy}
            className="rounded-full border-2 border-ink bg-lime px-4 py-1.5 text-sm font-bold text-ink disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Registrar pago"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-ink bg-paper px-4 py-1.5 text-sm font-bold text-ink"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentsHistory({ clubId }: { clubId: string }) {
  const q = useQuery({
    queryKey: ["club-payments", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_payments" as never)
        .select("id, paid_at, months, amount, note")
        .eq("club_id", clubId)
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PaymentRow[];
    },
  });

  if (q.isLoading) return <p className="mt-2 text-xs text-ink/60">Cargando pagos…</p>;
  if (q.error) return <p className="mt-2 text-xs text-pa-red">{(q.error as Error).message}</p>;
  if (!q.data?.length) return <p className="mt-2 text-xs text-ink/60">Sin pagos registrados.</p>;

  return (
    <ul className="mt-2 space-y-1 text-xs text-ink">
      {q.data.map((p) => (
        <li key={p.id} className="rounded-xl border-2 border-ink/15 px-3 py-1.5">
          <span className="font-semibold">{ddmm(p.paid_at)}</span> · {p.months}{" "}
          {p.months === 1 ? "mes" : "meses"} · ${Number(p.amount ?? 0).toFixed(2)}
          {p.note ? ` · ${p.note}` : ""}
        </li>
      ))}
    </ul>
  );
}

function SubscriptionPanel({ club }: { club: ClubRow }) {
  const qc = useQueryClient();
  const [pay, setPay] = useState(false);
  const [hist, setHist] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggleBlocked = async () => {
    const next = !club.blocked;
    if (
      !window.confirm(
        next
          ? `¿Suspender el acceso de ${club.club_name}?`
          : `¿Reactivar el acceso de ${club.club_name}?`,
      )
    )
      return;
    setBusy(true);
    const { error } = await supabase.rpc("set_club_blocked" as never, {
      _club_id: club.club_id,
      _blocked: next,
    } as never);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(next ? "Acceso suspendido" : "Acceso reactivado");
    qc.invalidateQueries({ queryKey: ["platform-overview"] });
  };

  return (
    <div className="mt-4 rounded-xl border-2 border-ink/15 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPay(true)}
          className="rounded-full border-2 border-ink bg-lime px-4 py-1.5 text-sm font-bold text-ink"
        >
          💵 Registrar pago
        </button>
        <button
          type="button"
          onClick={() => setHist((v) => !v)}
          className="rounded-full border-2 border-ink bg-paper px-4 py-1.5 text-sm font-bold text-ink hover:bg-lime transition-colors"
        >
          {hist ? "Ocultar historial" : "Historial de pagos"}
        </button>
        <button
          type="button"
          onClick={toggleBlocked}
          disabled={busy}
          className="rounded-full border-2 border-pa-red bg-paper px-4 py-1.5 text-sm font-bold text-pa-red hover:bg-pa-red hover:text-paper transition-colors disabled:opacity-50"
        >
          {club.blocked ? "Reactivar" : "Suspender acceso"}
        </button>
      </div>
      {hist && <PaymentsHistory clubId={club.club_id} />}
      {pay && <PaymentModal club={club} onClose={() => setPay(false)} />}
    </div>
  );
}

function ClubCard({ club, danger }: { club: ClubRow; danger?: boolean }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(false);
  const [del, setDel] = useState(false);

  const pct = notifPct(club);

  return (
    <article
      className={`rounded-2xl border-2 bg-paper p-4 md:p-5 ${danger ? "border-pa-red" : "border-ink"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold text-ink">{club.club_name}</h3>
          <p className="text-xs text-ink/60">Creado {hace(club.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge estado={club.estado} />
          <SubStatusChip club={club} />
        </div>
      </div>

      <SubscriptionPanel club={club} />


      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-ink">{club.admin_name ?? "Sin profe"}</span>
        <span className="text-ink/60">{club.admin_email ?? "sin correo"}</span>
        {club.admin_email && <CopyButton value={club.admin_email} label="Copiar correo" />}
        {club.admin_email && (
          <a
            href={`mailto:${club.admin_email}?subject=${encodeURIComponent(`FullTime — tu equipo ${club.club_name}`)}`}
            className="rounded-full border-2 border-ink bg-lime px-3 py-1 text-xs font-semibold text-ink hover:bg-ink hover:text-paper transition-colors"
          >
            Escribir correo
          </a>
        )}
      </div>

      <CrmPanel club={club} />



      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Categorías", club.categorias_count],
          ["Jugadoras", `${club.jugadoras_vinculadas}/${club.jugadoras_total}`],
          ["Pendientes", club.jugadoras_pendientes],
          ["Convocatorias", club.convocatorias_total],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl border-2 border-ink/15 px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wide text-ink/60">{k}</dt>
            <dd className="font-display text-lg font-bold text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs text-ink/60">Cuerpo técnico: {club.staff_count}</p>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs font-semibold text-ink">
          <span>Notificaciones activadas</span>
          <span>
            {club.notif_activadas ?? 0}/{club.jugadoras_vinculadas} · {pct}%
          </span>
        </div>
        <div className="mt-1 h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-paper">
          <div className="h-full bg-lime" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border-2 border-ink bg-lime px-4 py-1.5 text-sm font-bold text-ink"
        >
          {open ? "Ocultar jugadoras pendientes" : "Ver jugadoras pendientes"}
        </button>
        <button
          type="button"
          onClick={() => setDetail(true)}
          className="rounded-full border-2 border-ink bg-paper px-4 py-1.5 text-sm font-bold text-ink hover:bg-lime transition-colors"
        >
          🔍 Ver detalle
        </button>
        <button
          type="button"
          onClick={() => setDel(true)}
          className="rounded-full border-2 border-pa-red bg-paper px-4 py-1.5 text-sm font-bold text-pa-red hover:bg-pa-red hover:text-paper transition-colors"
        >
          🗑 Eliminar
        </button>
      </div>
      {detail && <ClubDetailModal club={club} onClose={() => setDetail(false)} />}
      {del && <DeleteClubModal club={club} onClose={() => setDel(false)} />}
      {open && <PendingList clubId={club.club_id} />}
    </article>
  );
}

function DeleteClubModal({ club, onClose }: { club: ClubRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const match = text.trim() === club.club_name.trim();

  const confirmar = async () => {
    if (!match || busy) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("delete_club", { _club_id: club.club_id });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["platform-overview"] }),
      qc.invalidateQueries({ queryKey: ["platform-kpis"] }),
    ]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 py-16"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border-2 border-pa-red bg-paper p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-2xl font-bold text-pa-red">Eliminar club</h3>
        <p className="mt-3 text-sm text-ink">
          Vas a eliminar <strong>{club.club_name}</strong> y TODA su data (jugadoras, convocatorias,
          etc.). Esto NO se puede deshacer.
        </p>
        <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-ink/70">
          Escribe exactamente el nombre del club
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={club.club_name}
          className="mt-1 w-full rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm text-ink outline-none"
        />
        {err && <p className="mt-3 text-sm text-pa-red">No se pudo eliminar: {err}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-ink bg-paper px-4 py-2 text-sm font-bold text-ink"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!match || busy}
            className="rounded-full border-2 border-pa-red bg-pa-red px-4 py-2 text-sm font-bold text-paper disabled:opacity-40"
          >
            {busy ? "Eliminando…" : "Eliminar definitivamente"}
          </button>
        </div>
      </div>
    </div>
  );
}


type Kpis = {
  total_clubes: number;
  total_jugadoras: number;
  jugadoras_vinculadas: number;
  jugadoras_pendientes: number;
  notif_adopcion_pct: number;
  clubes_nuevos_semana: number;
  pruebas_por_vencer: number;
  clubes_activos: number;
  clubes_dormidos: number;
  ingresos_mes?: number | string | null;
  funnel: {
    creados: number;
    con_jugadoras: number;
    con_aceptada: number;
    con_notif: number;
    con_convocatoria: number;
  };
};

function KpisSection() {
  const kpis = useQuery({
    queryKey: ["platform-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("platform_kpis" as never);
      if (error) throw error;
      return data as unknown as Kpis;
    },
  });

  if (kpis.isLoading) {
    return <p className="mt-8 text-sm text-ink/60">Cargando KPIs…</p>;
  }
  if (kpis.error || !kpis.data) {
    return (
      <p className="mt-8 rounded-2xl border-2 border-pa-red bg-pa-red/10 p-4 text-sm text-pa-red">
        No se pudieron cargar los KPIs: {(kpis.error as Error | null)?.message ?? "sin datos"}
      </p>
    );
  }

  const k = kpis.data;
  const base = Math.max(1, k.total_clubes);
  const etapas: Array<[string, number]> = [
    ["Creados", k.funnel.creados],
    ["Con jugadoras", k.funnel.con_jugadoras],
    ["Con jugadora que aceptó", k.funnel.con_aceptada],
    ["Con notificaciones", k.funnel.con_notif],
    ["Con convocatoria", k.funnel.con_convocatoria],
  ];

  const cards: Array<[string, string | number]> = [
    ["Clubes", k.total_clubes],
    ["Jugadoras activas", k.jugadoras_vinculadas],
    ["Adopción de notis", `${k.notif_adopcion_pct}%`],
    ["Nuevos esta semana", k.clubes_nuevos_semana],
    ["Activos vs dormidos", `${k.clubes_activos} / ${k.clubes_dormidos}`],
    ["Pruebas por vencer", k.pruebas_por_vencer],
    ["Ingresos del mes", `$${Number(k.ingresos_mes ?? 0).toFixed(2)}`],
  ];

  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-bold text-ink">📊 KPIs del negocio</h2>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border-2 border-ink bg-paper px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">
              {label}
            </p>
            <p className="font-display text-3xl font-bold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border-2 border-ink bg-paper p-5">
        <h3 className="font-display text-lg font-bold text-ink">Embudo de activación</h3>
        <p className="mt-1 text-xs text-ink/60">
          Dónde se caen los clubes, desde que se crean hasta su primera convocatoria.
        </p>
        <div className="mt-4 space-y-4">
          {etapas.map(([label, value], i) => {
            const pct = Math.round((value / base) * 100);
            return (
              <div key={label}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">{label}</span>
                  <span className="font-display text-lg font-bold text-ink">{value}</span>
                </div>
                <div className="mt-1 h-4 w-full overflow-hidden rounded-full border-2 border-ink bg-paper">
                  <div
                    className={i === etapas.length - 1 ? "h-full bg-ink" : "h-full bg-lime"}
                    style={{ width: `${Math.max(value > 0 ? 3 : 0, pct)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] font-semibold text-ink/60">
                  {pct}% de los clubes
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PanelFullTime() {

  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const gate = useQuery({
    queryKey: ["is-platform-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_platform_admin");
      if (error) throw error;
      return data === true;
    },
  });

  useEffect(() => {
    if (gate.isSuccess && gate.data === false) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [gate.isSuccess, gate.data, navigate]);

  const clubs = useQuery({
    queryKey: ["platform-overview"],
    enabled: gate.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("platform_overview");
      if (error) throw error;
      return (data ?? []) as unknown as ClubRow[];
    },
  });

  const rows = clubs.data ?? [];

  const totals = useMemo(
    () => ({
      clubes: rows.length,
      jugadoras: rows.reduce((a, c) => a + c.jugadoras_total, 0),
      pendientes: rows.reduce((a, c) => a + c.jugadoras_pendientes, 0),
      porVencer: rows.filter((c) => c.trial_days_left <= 7).length,
    }),
    [rows],
  );

  const prioridad = rows.filter(
    (c) => c.trial_days_left <= 7 || c.estado === "dormido" || c.convocatorias_total === 0,
  );
  const ayuda = rows.filter((c) => c.jugadoras_total === 0 || c.convocatorias_total === 0);
  const term = q.trim().toLowerCase();
  const filtrados = rows.filter(
    (c) =>
      !term ||
      c.club_name.toLowerCase().includes(term) ||
      (c.admin_email ?? "").toLowerCase().includes(term),
  );


  if (gate.isLoading || gate.data !== true) {
    return (
      <main className="min-h-screen bg-paper p-6">
        <p className="text-sm text-ink/60">Verificando acceso…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <a
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70 transition-colors hover:text-ink"
        >
          <span aria-hidden="true">←</span> Volver
        </a>
        <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">
          Panel FullTime · Dueña
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Vista global de todos los clubes para dar soporte concierge.
        </p>

        <KpisSection />


        {clubs.isLoading && <p className="mt-8 text-sm text-ink/60">Cargando clubes…</p>}
        {clubs.error && (
          <p className="mt-8 rounded-2xl border-2 border-pa-red bg-pa-red/10 p-4 text-sm text-pa-red">
            No se pudieron cargar los datos: {(clubs.error as Error).message}
          </p>
        )}

        {clubs.isSuccess && rows.length === 0 && (
          <p className="mt-8 rounded-2xl border-2 border-ink bg-paper p-6 text-sm text-ink/70">
            Todavía no hay clubes registrados.
          </p>
        )}

        {clubs.isSuccess && rows.length > 0 && (
          <>
            <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Clubes", totals.clubes],
                ["Jugadoras", totals.jugadoras],
                ["Pendientes de aceptar", totals.pendientes],
                ["Pruebas por vencer", totals.porVencer],
              ].map(([k, v]) => (
                <div
                  key={String(k)}
                  className="rounded-2xl border-2 border-ink bg-lime px-4 py-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/70">
                    {k}
                  </p>
                  <p className="font-display text-3xl font-bold text-ink">{v}</p>
                </div>
              ))}
            </section>

            {prioridad.length > 0 && (
              <section className="mt-10">
                <h2 className="font-display text-2xl font-bold text-ink">
                  🔥 Prioridad de outreach
                </h2>
                <div className="mt-4 space-y-4">
                  {prioridad.map((c) => (
                    <ClubCard key={c.club_id} club={c} danger />
                  ))}
                </div>
              </section>
            )}

            <section className="mt-10">
              <h2 className="font-display text-2xl font-bold text-ink">Todos los clubes</h2>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por club o correo…"
                className="mt-3 w-full max-w-xl rounded-full border-2 border-ink bg-paper px-5 py-3 text-base text-ink outline-none focus:bg-lime/20"
              />
              <div className="mt-4 space-y-4">
                {filtrados.length === 0 ? (
                  <p className="text-sm text-ink/60">Ningún club coincide con “{q}”.</p>
                ) : (

                  filtrados.map((c) => <ClubCard key={c.club_id} club={c} />)
                )}
              </div>
            </section>

            {ayuda.length > 0 && (
              <section className="mt-10 mb-12">
                <h2 className="font-display text-2xl font-bold text-ink">Necesitan ayuda</h2>
                <p className="text-sm text-ink/60">
                  Sin jugadoras o sin convocatorias — candidatos al setup concierge.
                </p>
                <ul className="mt-4 space-y-2">
                  {ayuda.map((c) => (
                    <li
                      key={c.club_id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-ink bg-paper px-4 py-3"
                    >
                      <span className="font-semibold text-ink">{c.club_name}</span>
                      <span className="text-xs text-ink/60">
                        {c.jugadoras_total} jugadoras · {c.convocatorias_total} convocatorias ·{" "}
                        {c.admin_email ?? "sin correo"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
