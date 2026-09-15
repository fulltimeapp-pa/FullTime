import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StaffShell } from "@/components/staff/StaffShell";
import { getMyActiveClub } from "@/lib/active-club";
import { sendPush } from "@/lib/push.functions";
import { CallUpFields } from "@/components/call-ups/CallUpFields";

export const Route = createFileRoute("/_authenticated/call-ups/new")({
  head: () => ({
    meta: [
      { title: "FullTime — Nuevo partido" },
      { name: "description", content: "Crea una convocatoria de partido para tu equipo." },
      { property: "og:title", content: "FullTime — Nuevo partido" },
      { property: "og:description", content: "Crea una convocatoria de partido para tu equipo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <StaffShell>
      <NewCallUp />
    </StaffShell>
  ),
});

type Cat = { id: string; name: string };
type PL = { id: string; full_name: string; jersey_number: number | null };

function todayLocalDate() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function NewCallUp() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });
  const clubId = clubQ.data?.club_id;

  const catsQ = useQuery({
    queryKey: ["categories", clubId],
    enabled: !!clubId,
    queryFn: async (): Promise<Cat[]> => {
      const { data, error } = await supabase
        .from("categories").select("id, name")
        .eq("club_id", clubId!).order("created_at");
      if (error) throw error;
      return (data ?? []) as Cat[];
    },
  });

  const [categoryId, setCategoryId] = useState("");
  useEffect(() => {
    if (!categoryId && catsQ.data?.length) setCategoryId(catsQ.data[0].id);
  }, [catsQ.data, categoryId]);

  const [date, setDate] = useState(todayLocalDate());
  const [time, setTime] = useState("18:00");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const playersQ = useQuery({
    queryKey: ["players-of-cat", categoryId],
    enabled: !!categoryId,
    queryFn: async (): Promise<PL[]> => {
      const { data, error } = await supabase
        .from("players").select("id, full_name, jersey_number")
        .eq("category_id", categoryId).order("full_name");
      if (error) throw error;
      return (data ?? []) as PL[];
    },
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (playersQ.data) setSelected(new Set(playersQ.data.map((p) => p.id)));
  }, [playersQ.data]);

  const players = playersQ.data ?? [];
  const allSelected = players.length > 0 && selected.size === players.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const createMut = useMutation({
    mutationFn: async () => {
      if (!clubId) throw new Error("Sin club activo.");
      if (!categoryId) throw new Error("Elige un equipo.");
      if (!place.trim()) throw new Error("Indica el lugar.");
      if (selected.size === 0) throw new Error("Selecciona al menos una jugadora.");
      const startsAt = new Date(`${date}T${time}:00`).toISOString();

      const { data: cu, error: cErr } = await supabase
        .from("call_ups")
        .insert({
          club_id: clubId, category_id: categoryId,
          kind: "partido", starts_at: startsAt, place: place.trim(),
          note: note.trim() || null, created_by: user.id,
        })
        .select("id").single();
      if (cErr) throw cErr;

      const rows = Array.from(selected).map((pid) => ({
        call_up_id: cu.id, player_id: pid,
      }));
      const { error: pErr } = await supabase.from("call_up_players").insert(rows);
      if (pErr) throw pErr;

      // Aviso push: complementario, nunca bloquea la creación.
      void sendPush({ data: { call_up_id: cu.id as string } }).catch((e) =>
        console.warn("No se pudo enviar el push", e),
      );
      return cu.id as string;
    },
    onSuccess: (id) => navigate({ to: "/call-ups/$id", params: { id } }),
    onError: (e: any) => setError(e?.message || "No pudimos crear la convocatoria."),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-paper/70 border-b border-ink/10">
        <div className="mx-auto max-w-3xl px-5 py-3.5 flex items-center">
          <Link to="/call-ups" className="flex items-center gap-2 text-sm font-semibold hover:opacity-70">
            <ArrowLeft size={16} /> Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-display text-4xl md:text-5xl font-bold leading-[0.95]">
          Nuevo <span className="marker-underline">partido</span>
        </h1>

        <form
          onSubmit={(e) => { e.preventDefault(); setError(""); createMut.mutate(); }}
          className="mt-8 space-y-6"
        >
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Equipo</label>
            <select
              value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 font-semibold"
            >
              {(catsQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>


          <CallUpFields
            value={{ date, time, place, note, objetivo: "" }}
            onChange={(p) => {
              if (p.date !== undefined) setDate(p.date);
              if (p.time !== undefined) setTime(p.time);
              if (p.place !== undefined) setPlace(p.place);
              if (p.note !== undefined) setNote(p.note);
            }}
          />

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-ink/50">
                Convocar ({selected.size} de {players.length})
              </label>
              <button
                type="button"
                onClick={() => setSelected(allSelected ? new Set() : new Set(players.map((p) => p.id)))}
                className="text-xs font-semibold underline"
              >
                {allSelected ? "Deseleccionar todas" : "Seleccionar todas"}
              </button>
            </div>
            <div className="mt-2 rounded-xl border-2 border-ink bg-card divide-y divide-ink/10 max-h-72 overflow-auto">
              {playersQ.isLoading ? (
                <p className="p-4 text-sm text-ink/50">Cargando plantel...</p>
              ) : players.length === 0 ? (
                <p className="p-4 text-sm text-ink/50">
                  Este equipo aún no tiene jugadoras. <Link to="/roster" className="underline font-semibold">Ve al plantel</Link>.
                </p>
              ) : (
                players.map((p) => {
                  const on = selected.has(p.id);
                  return (
                    <button
                      key={p.id} type="button"
                      onClick={() => toggle(p.id)}
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

          {error && (
            <div className="rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={createMut.isPending} className="btn-primary">
              {createMut.isPending ? "Creando..." : "Crear convocatoria"}
            </button>
            <Link to="/call-ups" className="btn-ghost">Cancelar</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
