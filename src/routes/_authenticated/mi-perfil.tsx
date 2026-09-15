import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, Hash, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyActiveClub, isStaffRole } from "@/lib/active-club";

export const Route = createFileRoute("/_authenticated/mi-perfil")({
  head: () => ({
    meta: [
      { title: "FullTime — Mi perfil" },
      { name: "description", content: "Tus datos como jugadora." },
      { property: "og:title", content: "FullTime — Mi perfil" },
      { property: "og:description", content: "Tus datos como jugadora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyProfile,
});

const POSITION_LABEL: Record<string, string> = {
  portera: "Portera",
  defensa: "Defensa",
  mediocampista: "Mediocampista",
  delantera: "Delantera",
};

type Player = {
  id: string;
  club_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  jersey_number: number | null;
  photo_path: string | null;
};

async function signPhoto(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("player-photos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

function MyProfile() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const clubQ = useQuery({ queryKey: ["my-club"], queryFn: getMyActiveClub });

  useEffect(() => {
    if (!clubQ.isSuccess) return;
    const data = clubQ.data;
    if (data && isStaffRole(data.role)) navigate({ to: "/dashboard", replace: true });
  }, [clubQ.isSuccess, clubQ.data, navigate]);

  const meQ = useQuery({
    queryKey: ["me-player-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, club_id, full_name, email, phone, position, jersey_number, photo_path")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Player | null;
    },
  });

  const photoUrlQ = useQuery({
    queryKey: ["me-photo-url", meQ.data?.photo_path],
    enabled: !!meQ.data?.photo_path,
    queryFn: () => signPhoto(meQ.data?.photo_path ?? null),
  });

  const attendanceQ = useQuery({
    queryKey: ["me-attendance", meQ.data?.id],
    enabled: !!meQ.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_up_players")
        .select("attended, call_ups(starts_at)")
        .eq("player_id", meQ.data!.id);
      if (error) throw error;
      const past = (data ?? []).filter(
        (r: any) => r.call_ups && new Date(r.call_ups.starts_at).getTime() < Date.now(),
      );
      const asistio = past.filter((r: any) => r.attended === true).length;
      const falto = past.filter((r: any) => r.attended === false).length;
      const marcadas = asistio + falto;
      return { asistio, falto, marcadas, pct: marcadas ? Math.round((asistio / marcadas) * 100) : null };
    },
  });

  const me = meQ.data;
  const displayName = me?.full_name?.trim() || (user.user_metadata?.full_name as string | undefined) || "Jugadora";
  const photoUrl = photoUrlQ.data ?? null;
  const att = attendanceQ.data;


  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-paper/70 border-b border-ink/10">
        <div className="mx-auto max-w-3xl px-5 py-3.5 flex items-center">
          <Link to="/inicio" className="flex items-center gap-2 text-sm font-semibold hover:opacity-70">
            <ArrowLeft size={16} /> Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <span className="chip">
          <span className="h-1.5 w-1.5 rounded-full bg-lime inline-block" /> Tu perfil
        </span>
        <h1 className="mt-4 text-display text-4xl md:text-5xl font-bold leading-[0.95]">
          Mi <span className="marker-underline">perfil</span>
        </h1>

        {meQ.isLoading ? (
          <p className="mt-8 text-sm text-ink/50">Cargando tu ficha...</p>
        ) : !me ? (
          <div className="mt-8 rounded-2xl border-2 border-ink bg-card p-6">
            <p className="font-semibold">Aún no encontramos tu ficha en el club.</p>
            <p className="mt-2 text-sm text-ink/60">
              Pídele a tu Profe que te agregue al plantel y te vuelva a enviar el link de invitación.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <section className="rounded-2xl border-2 border-ink bg-card p-6 md:p-7">
              <div className="flex items-center gap-5">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-ink bg-paper">
                  {photoUrl ? (
                    <img src={photoUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-display text-3xl font-bold text-ink">
                      {initialsOf(displayName)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold truncate">{displayName}</h2>
                  <p className="mt-1 text-sm text-ink/60">
                    Tu foto la administra tu Profe desde el plantel, para que el equipo se vea uniforme.
                  </p>
                </div>
              </div>
            </section>

            {att && (att.marcadas > 0 || attendanceQ.isSuccess) && (
              <section className="rounded-2xl border-2 border-ink bg-card p-6 md:p-7">
                <h2 className="font-display text-xl font-bold">Tu asistencia</h2>
                {att.marcadas === 0 ? (
                  <p className="mt-2 text-sm text-ink/60">Aún sin datos.</p>
                ) : (
                  <>
                    <p className="mt-2 text-3xl font-display font-bold">
                      {att.pct}%
                    </p>
                    <p className="mt-1 text-sm text-ink/60">
                      Asististe a {att.asistio} de {att.marcadas} eventos.
                    </p>
                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
                      <div
                        className={`h-full rounded-full ${att.pct != null && att.pct < 60 ? "bg-pa-red" : "bg-lime"}`}
                        style={{ width: `${att.pct ?? 0}%` }}
                      />
                    </div>
                  </>
                )}
              </section>
            )}



            <section className="rounded-2xl border-2 border-ink bg-card p-6 md:p-7">
              <h2 className="font-display text-xl font-bold">Tus datos</h2>
              <p className="mt-1 text-sm text-ink/60">
                Estos datos los administra tu Profe. Si algo está mal, pídele que lo ajuste.
              </p>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Nombre completo" value={me.full_name || "—"} />
                <Field
                  label="Dorsal"
                  icon={<Hash size={14} />}
                  value={me.jersey_number != null ? `#${me.jersey_number}` : "Sin definir"}
                  muted={me.jersey_number == null}
                />
                <Field
                  label="Posición"
                  icon={<MapPin size={14} />}
                  value={me.position ? POSITION_LABEL[me.position] ?? me.position : "Sin definir"}
                  muted={!me.position}
                />
                <Field
                  label="Correo"
                  icon={<Mail size={14} />}
                  value={me.email || "Sin definir"}
                  muted={!me.email}
                />
                <Field
                  label="Teléfono / WhatsApp"
                  icon={<Phone size={14} />}
                  value={me.phone || "Sin definir"}
                  muted={!me.phone}
                />
              </dl>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  icon,
  muted,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-mono uppercase tracking-wider text-ink/50 inline-flex items-center gap-1.5">
        {icon} {label}
      </dt>
      <dd className={`mt-1 text-base font-semibold ${muted ? "text-ink/40 italic" : "text-ink"}`}>
        {value}
      </dd>
    </div>
  );
}
