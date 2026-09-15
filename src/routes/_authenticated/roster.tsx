import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Pencil, Plus, Search, Send, Share2, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyActiveClub } from "@/lib/active-club";
import { PhotoCropInput } from "@/components/roster/PhotoCropInput";
import { StaffShell } from "@/components/staff/StaffShell";


export const Route = createFileRoute("/_authenticated/roster")({
  head: () => ({
    meta: [
      { title: "FullTime — Plantel" },
      { name: "description", content: "Arma el plantel de tus categorías en FullTime." },
      { property: "og:title", content: "FullTime — Plantel" },
      { property: "og:description", content: "Arma el plantel de tus categorías en FullTime." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RosterPage,
});

type Category = { id: string; name: string; club_id: string };
type PlayerPosition = "portera" | "defensa" | "mediocampista" | "delantera";
type Player = {
  id: string;
  category_id: string;
  club_id: string;
  full_name: string;
  email: string;
  position: PlayerPosition | null;
  jersey_number: number | null;
  phone: string | null;
  birth_date: string | null;
  invited_at: string | null;
  photo_path: string | null;
  invite_token: string | null;
  /** Client-only: signed URL derived from photo_path. */
  photo_url?: string | null;
};

async function signPhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("player-photos")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

async function signPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabase.storage
    .from("player-photos")
    .createSignedUrls(paths, 60 * 60);
  const map: Record<string, string> = {};
  (data ?? []).forEach((s, i) => {
    if (s.signedUrl) map[paths[i]] = s.signedUrl;
  });
  return map;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}


const POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: "portera", label: "Portera" },
  { value: "defensa", label: "Defensa" },
  { value: "mediocampista", label: "Mediocampista" },
  { value: "delantera", label: "Delantera" },
];

function translateDbError(raw: string): string {
  const m = (raw || "").toLowerCase();
  if (!raw) return "Algo salió mal. Vuelve a intentarlo.";
  if (m.includes("row-level security") || m.includes("permission") || m.includes("403"))
    return "No pudimos acceder a este club. Revisa que tu cuenta esté asociada como administradora.";
  if (m.includes("duplicate") || m.includes("unique"))
    return "Ya existe un registro con esos datos.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "Sin conexión. Revisa tu internet.";
  return "No pudimos completar la acción. Vuelve a intentarlo.";
}

const inputCls =
  "w-full rounded-xl border-2 border-ink/20 focus:border-ink bg-paper px-4 py-3 text-base outline-none transition-colors placeholder:text-ink/40";
const inputClsError =
  "w-full rounded-xl border-2 border-pa-red bg-paper px-4 py-3 text-base outline-none transition-colors placeholder:text-ink/40";

function RosterPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // 1. Load membership → club
  const membershipQ = useQuery({
    queryKey: ["my-club"],
    queryFn: getMyActiveClub,
  });

  useEffect(() => {
    if (
      membershipQ.isSuccess &&
      !membershipQ.isLoading &&
      !membershipQ.data?.club_id
    ) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [membershipQ.isSuccess, membershipQ.isLoading, membershipQ.data, navigate]);

  const clubId = membershipQ.data?.club_id as string | undefined;
  const clubName = (membershipQ.data?.club as { name?: string } | null)?.name ?? "";

  // 2. Categories
  const catQ = useQuery({
    queryKey: ["categories", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, club_id")
        .eq("club_id", clubId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  const categories = catQ.data ?? [];
  const clubLoadError = membershipQ.error instanceof Error ? membershipQ.error.message : "";
  const categoriesLoadError = catQ.error instanceof Error ? catQ.error.message : "";
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const pendingSelectedCatId = useRef<string | null>(null);
  useEffect(() => {
    if (pendingSelectedCatId.current) {
      if (categories.some((c) => c.id === pendingSelectedCatId.current)) {
        setSelectedCatId(pendingSelectedCatId.current);
        pendingSelectedCatId.current = null;
      }
      return;
    }
    if (!selectedCatId && categories.length > 0) setSelectedCatId(categories[0].id);
    if (selectedCatId && categories.length > 0 && !categories.find((c) => c.id === selectedCatId))
      setSelectedCatId(categories[0].id);
  }, [categories, selectedCatId]);

  // 3. Players of selected category
  const playersQ = useQuery({
    queryKey: ["players", selectedCatId],
    enabled: !!selectedCatId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("category_id", selectedCatId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const players = (data ?? []) as Player[];
      const paths = players
        .map((p) => p.photo_path)
        .filter((x): x is string => !!x);
      const urls = await signPhotoUrls(paths);
      return players.map((p) => ({
        ...p,
        photo_url: p.photo_path ? urls[p.photo_path] ?? null : null,
      }));
    },
  });

  const [search, setSearch] = useState("");
  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return playersQ.data ?? [];
    return (playersQ.data ?? []).filter((p) => p.full_name.toLowerCase().includes(q));
  }, [playersQ.data, search]);

  // 4. Modals state
  const [catModal, setCatModal] = useState<
    | { kind: "create" }
    | { kind: "rename"; category: Category }
    | null
  >(null);
  const [playerModal, setPlayerModal] = useState<
    | { kind: "create" }
    | { kind: "edit"; player: Player }
    | null
  >(null);
  const [confirmDelete, setConfirmDelete] = useState<
    | { kind: "category"; category: Category }
    | { kind: "player"; player: Player }
    | null
  >(null);
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // 5. Mutations
  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("categories")
        .insert({ club_id: clubId!, name: name.trim() })
        .select("id, name, club_id")
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: (cat) => {
      pendingSelectedCatId.current = cat.id;
      setSelectedCatId(cat.id);
      qc.setQueryData<Category[]>(["categories", clubId], (current) => {
        if (!current) return [cat];
        if (current.some((c) => c.id === cat.id)) return current;
        return [...current, cat];
      });
      qc.invalidateQueries({ queryKey: ["categories", clubId] });
      setCatModal(null);
      setToast("Categoría creada");
    },
  });

  const renameCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from("categories")
        .update({ name: name.trim() })
        .eq("id", id)
        .select("id, name, club_id")
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: (updated) => {
      qc.setQueryData<Category[]>(["categories", clubId], (current) =>
        (current ?? []).map((c) => (c.id === updated.id ? updated : c)),
      );
      qc.invalidateQueries({ queryKey: ["categories", clubId] });
      setCatModal(null);
      setToast("Categoría actualizada");
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      qc.setQueryData<Category[]>(["categories", clubId], (current) =>
        (current ?? []).filter((c) => c.id !== deletedId),
      );
      qc.invalidateQueries({ queryKey: ["categories", clubId] });
      setConfirmDelete(null);
      setToast("Categoría eliminada");
    },
  });

  const upsertPlayer = useMutation({
    mutationFn: async (payload: {
      id?: string;
      full_name: string;
      email: string;
      position: PlayerPosition | null;
      jersey_number: number | null;
      phone: string | null;
      birth_date: string | null;
      photo_path: string | null;
      /** Previous photo_path that should be deleted from storage after save. */
      previousPhotoPath?: string | null;
    }) => {
      let result: { mode: "update" | "insert"; player: Player };
      if (payload.id) {
        const { data, error } = await supabase
          .from("players")
          .update({
            full_name: payload.full_name,
            email: payload.email,
            position: payload.position,
            jersey_number: payload.jersey_number,
            phone: payload.phone,
            birth_date: payload.birth_date,
            photo_path: payload.photo_path,
          })
          .eq("id", payload.id)
          .select("*")
          .single();
        if (error) throw error;
        result = { mode: "update", player: data as Player };
      } else {
        const { data, error } = await supabase
          .from("players")
          .insert({
            category_id: selectedCatId!,
            club_id: clubId!,
            full_name: payload.full_name,
            email: payload.email,
            position: payload.position,
            jersey_number: payload.jersey_number,
            phone: payload.phone,
            birth_date: payload.birth_date,
            photo_path: payload.photo_path,
          })
          .select("*")
          .single();
        if (error) throw error;
        result = { mode: "insert", player: data as Player };
      }
      // Best-effort cleanup of the old photo (fire-and-forget).
      if (
        payload.previousPhotoPath &&
        payload.previousPhotoPath !== payload.photo_path
      ) {
        await supabase.storage
          .from("player-photos")
          .remove([payload.previousPhotoPath])
          .catch(() => undefined);
      }
      const photo_url = await signPhotoUrl(result.player.photo_path);
      const enriched: Player = { ...result.player, photo_url };
      return { mode: result.mode, player: enriched };
    },
    onSuccess: (result) => {
      const catKey = ["players", result.player.category_id] as const;
      qc.setQueryData<Player[]>(catKey, (current) => {
        if (!current) return [result.player];
        if (result.mode === "insert") {
          if (current.some((p) => p.id === result.player.id)) return current;
          return [...current, result.player];
        }
        return current.map((p) => (p.id === result.player.id ? result.player : p));
      });
      qc.invalidateQueries({ queryKey: catKey });
    },
  });

  const deletePlayer = useMutation({
    mutationFn: async (player: Player) => {
      const { error } = await supabase.from("players").delete().eq("id", player.id);
      if (error) throw error;
      if (player.photo_path) {
        await supabase.storage
          .from("player-photos")
          .remove([player.photo_path])
          .catch(() => undefined);
      }
      return player.id;
    },
    onSuccess: (deletedId) => {
      qc.setQueryData<Player[]>(["players", selectedCatId], (current) =>
        (current ?? []).filter((p) => p.id !== deletedId),
      );
      qc.invalidateQueries({ queryKey: ["players", selectedCatId] });
      setConfirmDelete(null);
      setToast("Jugadora eliminada");
    },
  });

  const [inviteModal, setInviteModal] = useState<{ player: Player; token: string } | null>(null);

  const invitePlayer = useMutation({
    mutationFn: async (player: Player) => {
      let token = player.invite_token ?? null;
      const updates: { invited_at: string; invite_expires_at: string; invite_token?: string } = {
        invited_at: new Date().toISOString(),
        invite_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      };
      if (!token) {
        if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
          throw new Error("Tu navegador no puede generar un link seguro. Actualízalo e intenta de nuevo.");
        }
        token = crypto.randomUUID().replace(/-/g, "");
        updates.invite_token = token;
      }
      const { data, error } = await supabase
        .from("players")
        .update(updates)
        .eq("id", player.id)
        .select("*")
        .single();
      if (error) throw error;
      return { player: data as Player, token: token! };
    },
    onSuccess: ({ player, token }) => {
      const catKey = ["players", player.category_id] as const;
      qc.setQueryData<Player[]>(catKey, (current) =>
        (current ?? []).map((p) =>
          p.id === player.id
            ? { ...p, invited_at: player.invited_at, invite_token: player.invite_token }
            : p,
        ),
      );
      qc.invalidateQueries({ queryKey: catKey });
      setInviteModal({ player, token });
    },
  });

  const selectedCat = categories.find((c) => c.id === selectedCatId) ?? null;
  const playerCount = playersQ.data?.length ?? 0;

  return (
    <StaffShell>
      <main className="mx-auto max-w-6xl px-5 py-8 md:py-12">

        <span className="chip">
          <span className="h-1.5 w-1.5 rounded-full bg-lime inline-block" />
          Plantel
        </span>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-display font-display text-4xl md:text-5xl font-bold leading-[0.95]">
            Tu <span className="marker-underline">plantel</span>
          </h1>
          <p className="text-sm text-ink/60">
            {playerCount} {playerCount === 1 ? "jugadora" : "jugadoras"}
            {selectedCat ? <> en <span className="font-semibold text-ink">{selectedCat.name}</span></> : null}
          </p>
        </div>

        {/* Category tabs */}
        <section className="mt-8">
          <label className="text-xs font-mono uppercase tracking-wider text-ink/50">
            Categoría / equipo
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {catQ.isLoading ? (
              <span className="text-sm text-ink/50">Cargando...</span>
            ) : membershipQ.isError ? (
              <div className="w-full rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
                No pudimos verificar tu club. {clubLoadError ? `Detalle: ${clubLoadError}` : "Quédate aquí e intenta recargar."}
              </div>
            ) : catQ.isError ? (
              <div className="w-full rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
                No pudimos cargar tus categorías. {translateDbError(categoriesLoadError)}
              </div>
            ) : categories.length === 0 ? (
              <span className="text-sm text-ink/50">Sin categorías todavía.</span>
            ) : (
              categories.map((c) => {
                const active = c.id === selectedCatId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCatId(c.id)}
                    className={
                      active
                        ? "inline-flex items-center gap-2 rounded-full border-2 border-ink bg-ink text-paper px-4 py-2 text-sm font-semibold"
                        : "inline-flex items-center gap-2 rounded-full border-2 border-ink/20 bg-paper text-ink px-4 py-2 text-sm font-semibold hover:border-ink transition-colors"
                    }
                  >
                    {c.name}
                  </button>
                );
              })
            )}
            <button
              onClick={() => setCatModal({ kind: "create" })}
              disabled={!clubId || catQ.isError || membershipQ.isError}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-ink/30 hover:border-ink px-4 py-2 text-sm font-semibold text-ink/70 hover:text-ink transition-colors"
            >
              <Plus size={16} /> Nueva categoría
            </button>
            {selectedCat && (
              <>
                <button
                  onClick={() => setCatModal({ kind: "rename", category: selectedCat })}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/10 hover:border-ink/40 px-3 py-2 text-xs font-semibold text-ink/60 hover:text-ink transition-colors"
                  title="Renombrar categoría"
                >
                  <Pencil size={13} /> Renombrar
                </button>
                <button
                  onClick={() => setConfirmDelete({ kind: "category", category: selectedCat })}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/10 hover:border-pa-red px-3 py-2 text-xs font-semibold text-ink/60 hover:text-pa-red transition-colors"
                  title="Eliminar categoría"
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </>
            )}
          </div>
        </section>

        {/* Search + add */}
        <section className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar jugadora por nombre..."
              className="w-full rounded-xl border-2 border-ink/20 focus:border-ink bg-paper pl-9 pr-4 py-3 text-sm outline-none transition-colors placeholder:text-ink/40"
            />
          </div>
          <button
            onClick={() => selectedCatId && setPlayerModal({ kind: "create" })}
            disabled={!selectedCatId}
            className="btn-primary !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} className="inline-block -mt-0.5 mr-1" />
            Agregar jugadora
          </button>
        </section>

        {/* Players list */}
        <section className="mt-6">
          {playersQ.isLoading ? (
            <div className="rounded-2xl border-2 border-dashed border-ink/20 bg-card p-8 text-center text-ink/50">
              Cargando plantel...
            </div>
          ) : playersQ.isError ? (
            <div className="rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
              {translateDbError(playersQ.error instanceof Error ? playersQ.error.message : "")}
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-ink/20 bg-card p-8 md:p-10 text-center">
              <p className="text-ink/60 font-medium">
                {search
                  ? "Ninguna jugadora coincide con tu búsqueda."
                  : "Todavía no hay jugadoras en esta categoría."}
              </p>
              {!search && (
                <p className="mt-1 text-sm text-ink/40">
                  Toca "Agregar jugadora" para armar tu plantel.
                </p>
              )}
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {filteredPlayers.map((p) => (
                <li
                  key={p.id}
                  className="rounded-2xl border-2 border-ink/10 bg-card p-4 md:p-5 hover:border-ink transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full overflow-hidden bg-lime text-ink font-display font-bold text-lg border-2 border-ink/10">
                        {p.photo_url ? (
                          <img
                            src={p.photo_url}
                            alt={`Foto de ${p.full_name}`}
                            className="h-full w-full object-cover"
                          />
                        ) : p.jersey_number != null ? (
                          <span>{p.jersey_number}</span>
                        ) : (
                          <span>{initialsOf(p.full_name)}</span>
                        )}
                      </div>
                      {p.photo_url && p.jersey_number != null && (
                        <span className="absolute -bottom-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-ink text-lime text-[11px] font-display font-bold flex items-center justify-center border-2 border-paper shadow-sm">
                          {p.jersey_number}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">
                        {(() => {
                          const posLabel = p.position
                            ? POSITIONS.find((x) => x.value === p.position)?.label
                            : null;
                          const parts = [p.full_name];
                          if (posLabel) parts.push(posLabel);
                          if (p.jersey_number != null) parts.push(`#${p.jersey_number}`);
                          return parts.join(" · ");
                        })()}
                      </p>
                      <p className="text-xs text-ink/50 truncate font-mono">{p.email}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">

                        {p.phone && (
                          <span className="text-ink/50 font-mono">{p.phone}</span>
                        )}
                        {p.invited_at && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-lime/40 px-2 py-0.5 font-semibold text-ink">
                            <Check size={11} /> Invitada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => invitePlayer.mutate(p)}
                      disabled={invitePlayer.isPending}
                      className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-ink text-lime px-3 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                    >
                      <Send size={12} /> {p.invited_at ? "Compartir link" : "Invitar a la app"}
                    </button>
                    <button
                      onClick={() => setPlayerModal({ kind: "edit", player: p })}
                      className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 hover:border-ink px-3 py-1.5 text-xs font-semibold text-ink/70 hover:text-ink transition-colors"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ kind: "player", player: p })}
                      className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 hover:border-pa-red px-3 py-1.5 text-xs font-semibold text-ink/60 hover:text-pa-red transition-colors"
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Category modal */}
      {catModal && (
        <CategoryModal
          initialName={catModal.kind === "rename" ? catModal.category.name : ""}
          title={catModal.kind === "rename" ? "Renombrar categoría" : "Nueva categoría"}
          submitting={createCategory.isPending || renameCategory.isPending}
          errorMsg={
            createCategory.error instanceof Error
              ? translateDbError(createCategory.error.message)
              : renameCategory.error instanceof Error
                ? translateDbError(renameCategory.error.message)
                : ""
          }
          onClose={() => setCatModal(null)}
          onSubmit={(name) => {
            if (catModal.kind === "rename")
              renameCategory.mutate({ id: catModal.category.id, name });
            else createCategory.mutate(name);
          }}
        />
      )}

      {/* Player modal */}
      {playerModal && selectedCatId && clubId && (
        <PlayerModal
          clubId={clubId}
          initial={playerModal.kind === "edit" ? playerModal.player : null}
          onClose={() => {
            setPlayerModal(null);
            upsertPlayer.reset();
          }}
          submitting={upsertPlayer.isPending}
          errorMsg={
            upsertPlayer.error instanceof Error
              ? translateDbError(upsertPlayer.error.message)
              : ""
          }
          onSubmit={async (payload, keepOpen) => {
            const id = playerModal.kind === "edit" ? playerModal.player.id : undefined;
            const previousPhotoPath =
              playerModal.kind === "edit" ? playerModal.player.photo_path : null;
            await upsertPlayer.mutateAsync({ id, ...payload, previousPhotoPath });
            if (keepOpen && !id) {
              setToast("Jugadora agregada");
              return "reset";
            }
            setPlayerModal(null);
            setToast(id ? "Jugadora actualizada" : "Jugadora agregada");
            return "close";
          }}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <ConfirmModal
          title={
            confirmDelete.kind === "category"
              ? `¿Eliminar "${confirmDelete.category.name}"?`
              : `¿Eliminar a ${confirmDelete.player.full_name}?`
          }
          message={
            confirmDelete.kind === "category"
              ? "Se eliminarán también todas las jugadoras de esta categoría. Esta acción no se puede deshacer."
              : "Esta acción no se puede deshacer."
          }
          submitting={deleteCategory.isPending || deletePlayer.isPending}
          errorMsg={
            deleteCategory.error instanceof Error
              ? translateDbError(deleteCategory.error.message)
              : deletePlayer.error instanceof Error
                ? translateDbError(deletePlayer.error.message)
                : ""
          }
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete.kind === "category")
              deleteCategory.mutate(confirmDelete.category.id);
            else deletePlayer.mutate(confirmDelete.player);
          }}
        />
      )}

      {inviteModal && (
        <InviteModal
          player={inviteModal.player}
          token={inviteModal.token}
          clubName={clubName}
          onClose={() => setInviteModal(null)}
          onCopied={() => setToast("Link copiado")}
        />
      )}



      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full border-2 border-ink bg-ink text-paper px-5 py-2.5 text-sm font-semibold shadow-[4px_4px_0_0_var(--color-lime)]">
          {toast}
        </div>
      )}
    </StaffShell>
  );
}

/* -------- Modals -------- */

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border-2 border-ink bg-paper p-6 md:p-7 shadow-[6px_6px_0_0_var(--color-ink)] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CategoryModal({
  initialName,
  title,
  submitting,
  errorMsg,
  onClose,
  onSubmit,
}: {
  initialName: string;
  title: string;
  submitting: boolean;
  errorMsg: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <button onClick={onClose} className="text-ink/50 hover:text-ink">
          <X size={20} />
        </button>
      </div>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            setErr("Escribe un nombre.");
            return;
          }
          setErr("");
          onSubmit(name);
        }}
      >
        <div>
          <label className="block text-sm font-semibold mb-1.5">Nombre</label>
          <input
            ref={ref}
            className={err ? inputClsError : inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sub-15"
          />
          {err && <p className="mt-1.5 text-sm font-medium text-pa-red">{err}</p>}
        </div>
        {errorMsg && (
          <div className="rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
            {errorMsg}
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-ink/20 hover:border-ink bg-paper px-4 py-3 text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1 !py-3 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function PlayerModal({
  clubId,
  initial,
  submitting,
  errorMsg,
  onClose,
  onSubmit,
}: {
  clubId: string;
  initial: Player | null;
  submitting: boolean;
  errorMsg: string;
  onClose: () => void;
  onSubmit: (
    payload: {
      full_name: string;
      email: string;
      position: PlayerPosition | null;
      jersey_number: number | null;
      phone: string | null;
      birth_date: string | null;
      photo_path: string | null;
    },
    keepOpen: boolean,
  ) => Promise<"close" | "reset">;
}) {
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [position, setPosition] = useState<PlayerPosition | "">(initial?.position ?? "");
  const [jersey, setJersey] = useState<string>(
    initial?.jersey_number != null ? String(initial.jersey_number) : "",
  );
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [birth, setBirth] = useState(initial?.birth_date ?? "");
  const [errs, setErrs] = useState<{ full_name?: string; email?: string; jersey?: string; photo?: string }>({});
  // Photo state: photoPath is what we'll save; previewUrl is what we render.
  const [photoPath, setPhotoPath] = useState<string | null>(initial?.photo_path ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.photo_url ?? null);
  const [uploading, setUploading] = useState(false);
  // Orphan tracking: paths uploaded during this modal session that end up unused.
  const sessionUploads = useRef<string[]>([]);
  const localBlobUrl = useRef<string | null>(null);
  // Cleanup orphan uploads if user closes without saving.
  useEffect(() => {
    return () => {
      if (localBlobUrl.current) URL.revokeObjectURL(localBlobUrl.current);
      const orphans = sessionUploads.current.filter((p) => p !== photoPath);
      if (orphans.length) {
        void supabase.storage
          .from("player-photos")
          .remove(orphans)
          .catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function handlePicked(blob: Blob) {
    setUploading(true);
    setErrs((e) => ({ ...e, photo: undefined }));
    try {
      const filename = `${crypto.randomUUID()}.jpg`;
      const path = `${clubId}/${filename}`;
      const { error } = await supabase.storage
        .from("player-photos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      // Replace any previous session upload that never got saved.
      const previousSession = sessionUploads.current.filter((p) => p !== path);
      if (previousSession.length) {
        void supabase.storage
          .from("player-photos")
          .remove(previousSession)
          .catch(() => undefined);
      }
      sessionUploads.current = [path];
      setPhotoPath(path);
      if (localBlobUrl.current) URL.revokeObjectURL(localBlobUrl.current);
      const url = URL.createObjectURL(blob);
      localBlobUrl.current = url;
      setPreviewUrl(url);
    } catch (err) {
      setErrs((e) => ({
        ...e,
        photo: "No pudimos subir la foto. Intenta con otra.",
      }));
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    // If the removed photo was uploaded in this session, delete it now.
    if (photoPath && sessionUploads.current.includes(photoPath)) {
      void supabase.storage
        .from("player-photos")
        .remove([photoPath])
        .catch(() => undefined);
      sessionUploads.current = sessionUploads.current.filter((p) => p !== photoPath);
    }
    if (localBlobUrl.current) {
      URL.revokeObjectURL(localBlobUrl.current);
      localBlobUrl.current = null;
    }
    setPhotoPath(null);
    setPreviewUrl(null);
  }

  function resetForNew() {
    setFullName("");
    setEmail("");
    setPosition("");
    setJersey("");
    setPhone("");
    setBirth("");
    setErrs({});
    setPhotoPath(null);
    if (localBlobUrl.current) {
      URL.revokeObjectURL(localBlobUrl.current);
      localBlobUrl.current = null;
    }
    setPreviewUrl(null);
    sessionUploads.current = [];
    nameRef.current?.focus();
  }

  function validate() {
    const e: typeof errs = {};
    if (!fullName.trim()) e.full_name = "Escribe el nombre completo.";
    const emailTrim = email.trim();
    if (!emailTrim) e.email = "Escribe el correo.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) e.email = "Escribe un correo válido.";
    if (jersey.trim()) {
      const n = Number(jersey);
      if (!Number.isInteger(n) || n < 0 || n > 999) e.jersey = "Número entre 0 y 999.";
    }
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  async function submit(keepOpen: boolean) {
    if (!validate()) return;
    const result = await onSubmit(
      {
        full_name: fullName.trim(),
        email: email.trim(),
        position: (position || null) as PlayerPosition | null,
        jersey_number: jersey.trim() ? Number(jersey) : null,
        phone: phone.trim() || null,
        birth_date: birth.trim() || null,
        photo_path: photoPath,
      },
      keepOpen,
    );
    // Saved successfully: the photo is now "owned" by a player, not an orphan.
    sessionUploads.current = [];
    if (result === "reset") resetForNew();
  }

  const isEdit = !!initial;

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">
          {isEdit ? "Editar jugadora" : "Agregar jugadora"}
        </h2>
        <button onClick={onClose} className="text-ink/50 hover:text-ink">
          <X size={20} />
        </button>
      </div>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
      >
        <div>
          <label className="block text-sm font-semibold mb-2">Foto</label>
          <PhotoCropInput
            currentUrl={previewUrl}
            fallback={
              jersey.trim()
                ? jersey.trim()
                : fullName.trim()
                  ? initialsOf(fullName)
                  : "?"
            }
            onPicked={handlePicked}
            onRemove={handleRemove}
            disabled={uploading || submitting}
          />
          {errs.photo && (
            <p className="mt-1.5 text-sm font-medium text-pa-red">{errs.photo}</p>
          )}
          {uploading && (
            <p className="mt-1.5 text-xs text-ink/50">Subiendo foto…</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Nombre completo <span className="text-pa-red">*</span>
          </label>
          <input
            ref={nameRef}
            className={errs.full_name ? inputClsError : inputCls}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ana Rodríguez"
            autoComplete="off"
          />

          {errs.full_name && (
            <p className="mt-1.5 text-sm font-medium text-pa-red">{errs.full_name}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Correo <span className="text-pa-red">*</span>
          </label>
          <input
            type="email"
            className={errs.email ? inputClsError : inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ana@ejemplo.com"
            autoComplete="off"
          />
          {errs.email && <p className="mt-1.5 text-sm font-medium text-pa-red">{errs.email}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Posición</label>
            <select
              className={inputCls}
              value={position}
              onChange={(e) => setPosition(e.target.value as PlayerPosition | "")}
            >
              <option value="">—</option>
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Dorsal</label>
            <input
              inputMode="numeric"
              className={errs.jersey ? inputClsError : inputCls}
              value={jersey}
              onChange={(e) => setJersey(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="10"
              maxLength={3}
            />
            {errs.jersey && <p className="mt-1.5 text-sm font-medium text-pa-red">{errs.jersey}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Teléfono / WhatsApp</label>
            <input
              className={inputCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+507 6000-0000"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Fecha de nacimiento</label>
            <input
              type="date"
              className={inputCls}
              value={birth}
              onChange={(e) => setBirth(e.target.value)}
            />
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-ink/20 hover:border-ink bg-paper px-4 py-3 text-sm font-semibold transition-colors sm:flex-1"
          >
            Cancelar
          </button>
          {!isEdit && (
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={submitting}
              className="rounded-xl border-2 border-ink bg-paper hover:bg-ink hover:text-lime px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60 sm:flex-1"
            >
              {submitting ? "Guardando..." : "Guardar y agregar otra"}
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary !py-3 sm:flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ConfirmModal({
  title,
  message,
  submitting,
  errorMsg,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  submitting: boolean;
  errorMsg: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell onClose={onCancel}>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="mt-3 text-sm text-ink/70">{message}</p>
      {errorMsg && (
        <div className="mt-4 rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
          {errorMsg}
        </div>
      )}
      <div className="mt-6 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border-2 border-ink/20 hover:border-ink bg-paper px-4 py-3 text-sm font-semibold transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="flex-1 rounded-xl border-2 border-pa-red bg-pa-red text-paper px-4 py-3 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-70"
        >
          {submitting ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </ModalShell>
  );
}

function InviteModal({
  player,
  token,
  clubName,
  onClose,
  onCopied,
}: {
  player: Player;
  token: string;
  clubName: string;
  onClose: () => void;
  onCopied: () => void;
}) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/unirse/${token}`;
  const firstName = player.full_name.split(/\s+/)[0] || player.full_name;
  const message = `¡Hola ${firstName}! Te sumo al equipo ${clubName || "FullTime"} en FullTime. Entra aquí para confirmar tus convocatorias: ${link}`;

  const digits = (player.phone ?? "").replace(/\D/g, "");
  const waUrl = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      onCopied();
    } catch {
      /* ignore */
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Invitar a {firstName}</h2>
        <button onClick={onClose} className="text-ink/50 hover:text-ink">
          <X size={20} />
        </button>
      </div>
      <p className="mt-2 text-sm text-ink/60">
        Compártele este link para que confirme sus convocatorias desde su celular.
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
            <Copy size={14} /> Copiar
          </button>
        </div>
      </div>

      <div className="mt-5">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-lime text-ink px-4 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Share2 size={16} />
          {digits ? `Compartir por WhatsApp con ${firstName}` : "Compartir por WhatsApp"}
        </a>
        {!digits && (
          <p className="mt-2 text-xs text-ink/50">
            Tip: si guardas su teléfono en la ficha, el botón abre directo su chat.
          </p>
        )}
      </div>

      <div className="mt-6 flex">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border-2 border-ink/20 hover:border-ink bg-paper px-4 py-3 text-sm font-semibold transition-colors"
        >
          Listo
        </button>
      </div>
    </ModalShell>
  );
}
