import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Share2, Shield, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyActiveClub, type ClubRole } from "@/lib/active-club";
import { StaffShell } from "@/components/staff/StaffShell";
import { PhotoCropInput } from "@/components/roster/PhotoCropInput";
import { CLUB_LOGOS_BUCKET, signClubLogo } from "@/components/brand/ClubCrest";


export const Route = createFileRoute("/_authenticated/equipo")({
  head: () => ({
    meta: [
      { title: "FullTime — Equipo" },
      { name: "description", content: "Gestiona tu club, categorías y cuerpo técnico en FullTime." },
      { property: "og:title", content: "FullTime — Equipo" },
      { property: "og:description", content: "Gestiona tu club, categorías y cuerpo técnico en FullTime." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <StaffShell>
      <EquipoPage />
    </StaffShell>
  ),
});

type StaffMember = {
  id: string;
  user_id: string;
  role: ClubRole;
  created_at: string;
  display_name: string;
  email: string | null;
};

type StaffInvite = {
  id: string;
  token: string;
  role: "admin" | "coach";
  created_at: string;
  accepted_at: string | null;
  email: string | null;
  expires_at: string | null;
};

const ROLE_LABEL: Record<ClubRole, string> = {
  owner: "Dueño/a",
  admin: "Admin",
  coach: "Cuerpo técnico",
  jugadora: "Jugadora",
};

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function EquipoPage() {
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();

  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });
  const clubId = clubQ.data?.club_id ?? null;
  const clubName = clubQ.data?.club?.name ?? "";
  const myRole = clubQ.data?.role ?? null;
  const isAdmin = myRole === "owner" || myRole === "admin";
  const logoPath = clubQ.data?.club?.logo_path ?? null;

  const logoUrlQ = useQuery({
    queryKey: ["club-logo-url", logoPath],
    enabled: !!logoPath,
    queryFn: () => signClubLogo(logoPath),
  });

  const logoMut = useMutation({
    mutationFn: async (blob: Blob | null) => {
      if (!clubId) throw new Error("Sin club activo.");
      let newPath: string | null = null;
      if (blob) {
        newPath = `${clubId}/logo-${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(CLUB_LOGOS_BUCKET)
          .upload(newPath, blob, { contentType: "image/jpeg", upsert: true });
        if (upErr) throw upErr;
      }
      const { error } = await supabase
        .from("clubs")
        .update({ logo_path: newPath })
        .eq("id", clubId);
      if (error) throw error;
      if (logoPath && logoPath !== newPath) {
        await supabase.storage.from(CLUB_LOGOS_BUCKET).remove([logoPath]).catch(() => {});
      }
      return newPath;
    },
    onSuccess: (p) => {
      toast.success(p ? "Escudo actualizado" : "Escudo eliminado");
      qc.invalidateQueries({ queryKey: ["my-club"] });
    },
    onError: () => toast.error("No pudimos guardar el escudo. Inténtalo de nuevo."),
  });



  const [nameDraft, setNameDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  useEffect(() => {
    setNameDraft(clubName);
  }, [clubName]);

  // Categories
  const catsQ = useQuery({
    queryKey: ["categories", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("club_id", clubId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Staff members
  const staffQ = useQuery({
    queryKey: ["staff-members", clubId],
    enabled: !!clubId,
    queryFn: async (): Promise<StaffMember[]> => {
      const { data: members, error } = await supabase
        .from("club_members")
        .select("id, user_id, role, created_at")
        .eq("club_id", clubId!)
        .in("role", ["owner", "admin", "coach"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      // Enrich with player fields for their display name/email (available under RLS to staff).
      const userIds = (members ?? []).map((m) => m.user_id);
      let names: Record<string, { full_name: string; email: string | null }> = {};
      if (userIds.length) {
        const { data: pl } = await supabase
          .from("players")
          .select("user_id, full_name, email")
          .in("user_id", userIds);
        (pl ?? []).forEach((p) => {
          if (p.user_id) names[p.user_id] = { full_name: p.full_name, email: p.email };
        });
      }
      return (members ?? []).map((m) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role as ClubRole,
        created_at: m.created_at,
        display_name:
          m.user_id === user.id
            ? ((user.user_metadata?.full_name as string | undefined)?.trim() || user.email?.split("@")[0] || "Tú")
            : (names[m.user_id]?.full_name || "Miembro"),
        email: m.user_id === user.id ? (user.email ?? null) : (names[m.user_id]?.email ?? null),
      }));
    },
  });

  // Pending invites
  const invitesQ = useQuery({
    queryKey: ["staff-invites", clubId],
    enabled: !!clubId && isAdmin,
    queryFn: async (): Promise<StaffInvite[]> => {
      const { data, error } = await supabase
        .from("staff_invites")
        .select("id, token, role, created_at, accepted_at, email, expires_at")
        .eq("club_id", clubId!)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StaffInvite[];
    },
  });

  const renameMut = useMutation({
    mutationFn: async (name: string) => {
      const clean = name.trim();
      if (!clean) throw new Error("El nombre no puede estar vacío.");
      const { error } = await supabase.from("clubs").update({ name: clean }).eq("id", clubId!);
      if (error) throw error;
      return clean;
    },
    onSuccess: () => {
      setEditingName(false);
      qc.invalidateQueries({ queryKey: ["my-club"] });
    },
  });

  const [inviteRole, setInviteRole] = useState<"admin" | "coach">("coach");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [newInvite, setNewInvite] = useState<StaffInvite | null>(null);

  const createInviteMut = useMutation({
    mutationFn: async ({ role, email }: { role: "admin" | "coach"; email: string }) => {
      const token = generateToken();
      const { data, error } = await supabase
        .from("staff_invites")
        .insert({
          club_id: clubId!,
          role,
          token,
          created_by: user.id,
          email: email.trim().toLowerCase(),
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id, token, role, created_at, accepted_at, email, expires_at")
        .single();
      if (error) throw error;
      return data as StaffInvite;
    },
    onSuccess: (inv) => {
      setNewInvite(inv);
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["staff-invites", clubId] });
    },
  });

  function submitInvite() {
    const email = inviteEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setInviteError("Escribe un correo válido.");
      return;
    }
    setInviteError("");
    createInviteMut.mutate({ role: inviteRole, email });
  }


  const deleteInviteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-invites", clubId] }),
  });

  const removeStaffMut = useMutation({
    mutationFn: async (member: StaffMember) => {
      const { error } = await supabase.from("club_members").delete().eq("id", member.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-members", clubId] }),
  });

  const cats = catsQ.data ?? [];
  const staff = staffQ.data ?? [];
  const invites = invitesQ.data ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 md:px-8 py-6 md:py-10">
      <div className="mb-6 md:mb-8">
        <span className="chip">
          <Shield size={12} /> Gestión de equipo
        </span>
        <h1 className="mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight">
          Equipo<span className="text-pa-red">.</span>
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Administra los datos del club, tus categorías y el cuerpo técnico.
        </p>
      </div>

      {/* Club data */}
      <section className="rounded-2xl border-2 border-ink/10 bg-paper p-5 md:p-6">
        <h2 className="font-display text-xl font-bold">Datos del club</h2>
        <div className="mt-4">
          <label className="block text-xs font-mono uppercase tracking-wider text-ink/50 mb-1.5">
            Nombre del club
          </label>
          {editingName && isAdmin ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="flex-1 rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-4 py-3 text-base outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => renameMut.mutate(nameDraft)}
                  disabled={renameMut.isPending}
                  className="btn-primary !py-2.5"
                >
                  {renameMut.isPending ? "Guardando..." : "Guardar"}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setNameDraft(clubName);
                  }}
                  className="rounded-xl border-2 border-ink/20 hover:border-ink bg-paper px-4 py-2.5 text-sm font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">{clubName || "—"}</div>
              {isAdmin && (
                <button
                  onClick={() => setEditingName(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/20 hover:border-ink bg-paper px-3 py-2 text-xs font-semibold"
                >
                  <Pencil size={12} /> Editar
                </button>
              )}
            </div>
          )}
          {renameMut.error && (
            <p className="mt-2 text-sm text-pa-red">
              No pudimos guardar el nombre. Inténtalo de nuevo.
            </p>
          )}
        </div>

        {isAdmin && clubId && (
          <div className="mt-6 border-t-2 border-ink/10 pt-5">
            <label className="block text-xs font-mono uppercase tracking-wider text-ink/50 mb-2">
              Escudo del club
            </label>
            <PhotoCropInput
              currentUrl={logoUrlQ.data ?? null}
              fallback={(clubName || "?").charAt(0).toUpperCase()}
              disabled={logoMut.isPending}
              onPicked={(blob) => logoMut.mutate(blob)}
              onRemove={() => logoMut.mutate(null)}
            />
            <p className="mt-2 text-xs text-ink/50">
              Se recorta cuadrado. Se verá en tu panel, el menú y el inicio de tus jugadoras.
            </p>
          </div>
        )}
      </section>


      {/* Categories */}
      <section className="mt-6 rounded-2xl border-2 border-ink/10 bg-paper p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">Categorías</h2>
          <Link
            to="/roster"
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink bg-paper px-3 py-2 text-xs font-semibold hover:bg-ink hover:text-lime transition-colors"
          >
            Gestionar en plantel
          </Link>
        </div>
        {catsQ.isLoading ? (
          <p className="mt-4 text-sm text-ink/60">Cargando categorías...</p>
        ) : cats.length === 0 ? (
          <p className="mt-4 text-sm text-ink/60">Aún no hay categorías.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {cats.map((c) => (
              <li
                key={c.id}
                className="inline-flex items-center rounded-lg border-2 border-ink/15 bg-paper px-3 py-1.5 text-sm font-semibold"
              >
                {c.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Staff */}
      <section className="mt-6 rounded-2xl border-2 border-ink/10 bg-paper p-5 md:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h2 className="font-display text-xl font-bold">Cuerpo técnico</h2>
          {isAdmin && (
            <div className="w-full sm:w-auto">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="email"
                  inputMode="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="correo de la persona"
                  className="rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2 text-sm outline-none min-w-[14rem]"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "coach")}
                  className="rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-3 py-2 text-sm outline-none"
                >
                  <option value="coach">Cuerpo técnico</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={submitInvite}
                  disabled={createInviteMut.isPending || !clubId}
                  className="inline-flex items-center gap-1.5 btn-primary !py-2.5"
                >
                  <UserPlus size={14} />
                  {createInviteMut.isPending ? "Creando..." : "Invitar al cuerpo técnico"}
                </button>
              </div>
              {inviteError && (
                <p className="mt-2 text-xs font-semibold text-pa-red">{inviteError}</p>
              )}
              <p className="mt-2 text-xs text-ink/50">
                El enlace solo funciona con ese correo y vence en 14 días.
              </p>
            </div>
          )}
        </div>


        {staffQ.isLoading ? (
          <p className="mt-4 text-sm text-ink/60">Cargando cuerpo técnico...</p>
        ) : (
          <ul className="mt-4 divide-y-2 divide-ink/5">
            {staff.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {m.display_name}
                    {m.user_id === user.id && <span className="ml-2 text-xs text-ink/50">(tú)</span>}
                  </div>
                  {m.email && (
                    <div className="text-xs text-ink/50 truncate">{m.email}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center rounded-lg border-2 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider ${
                      m.role === "owner"
                        ? "border-ink bg-ink text-lime"
                        : m.role === "admin"
                        ? "border-ink/70 bg-ink/5 text-ink"
                        : "border-ink/20 bg-paper text-ink/70"
                    }`}
                  >
                    {ROLE_LABEL[m.role]}
                  </span>
                  {isAdmin && m.role !== "owner" && m.user_id !== user.id && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Quitar a ${m.display_name} del cuerpo técnico?`)) {
                          removeStaffMut.mutate(m);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border-2 border-ink/20 hover:border-pa-red hover:text-pa-red bg-paper px-2 py-1.5 text-xs"
                      title="Quitar del cuerpo técnico"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {isAdmin && invites.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-mono uppercase tracking-wider text-ink/50 mb-2">
              Invitaciones pendientes
            </h3>
            <ul className="divide-y-2 divide-ink/5">
              {invites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {inv.email ?? "Sin correo"}
                    </div>
                    <div className="text-xs text-ink/50 truncate">
                      {inv.role === "admin" ? "Admin" : "Cuerpo técnico"}
                      {inv.expires_at &&
                        ` · vence ${new Date(inv.expires_at).toLocaleDateString("es-PA")}`}
                    </div>
                    <div className="text-xs text-ink/40 truncate font-mono">
                      /unirse-equipo/{inv.token.slice(0, 10)}…
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setNewInvite(inv)}
                      className="inline-flex items-center gap-1 rounded-lg border-2 border-ink/20 hover:border-ink bg-paper px-2.5 py-1.5 text-xs font-semibold"
                    >
                      <Share2 size={12} /> Compartir
                    </button>
                    <button
                      onClick={() => deleteInviteMut.mutate(inv.id)}
                      className="inline-flex items-center gap-1 rounded-lg border-2 border-ink/20 hover:border-pa-red hover:text-pa-red bg-paper px-2 py-1.5 text-xs"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {newInvite && (
        <StaffInviteModal
          invite={newInvite}
          clubName={clubName}
          onClose={() => setNewInvite(null)}
        />
      )}
    </div>
  );
}

function StaffInviteModal({
  invite,
  clubName,
  onClose,
}: {
  invite: StaffInvite;
  clubName: string;
  onClose: () => void;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/unirse-equipo/${invite.token}`;
  const roleLabel = invite.role === "admin" ? "Admin" : "Cuerpo técnico";
  const message = `¡Hola! Te invito a sumarte al cuerpo técnico de ${clubName || "nuestro club"} en FullTime como ${roleLabel}. Entra aquí para aceptar: ${link}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border-2 border-ink bg-paper p-6 shadow-[6px_6px_0_0_var(--color-lime)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Invitar como {roleLabel}</h2>
          <button onClick={onClose} className="text-ink/50 hover:text-ink">
            <X size={20} />
          </button>
        </div>
        <p className="mt-2 text-sm text-ink/60">
          Compárte este link. Al aceptar, entrará como {roleLabel.toLowerCase()} del club.
        </p>

        <div className="mt-5">
          <label className="block text-xs font-mono uppercase tracking-wider text-ink/50 mb-1.5">
            Link de invitación
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-xl border-2 border-ink/20 bg-paper px-3 py-2.5 text-sm font-mono outline-none"
            />
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink bg-paper px-3 py-2.5 text-sm font-semibold hover:bg-ink hover:text-lime transition-colors"
            >
              <Copy size={14} /> {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-lime text-ink px-4 py-3 text-sm font-semibold hover:opacity-90"
        >
          <Share2 size={16} /> Compartir por WhatsApp
        </a>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-xl border-2 border-ink/20 hover:border-ink bg-paper px-4 py-3 text-sm font-semibold"
        >
          Listo
        </button>
      </div>
    </div>
  );
}
