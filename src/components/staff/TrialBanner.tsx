import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trialDaysLeft } from "@/lib/active-club";

const WHATSAPP = "https://wa.me/50769911552";

function dias(n: number) {
  return n === 1 ? "1 día" : `${n} días`;
}

function fmt(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function daysUntil(date: string) {
  const end = new Date(`${date}T23:59:59`).getTime();
  return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
}

function Chip({ tone, children }: { tone: "lime" | "red"; children: React.ReactNode }) {
  return (
    <div
      className={
        tone === "lime"
          ? "inline-flex items-center gap-2 rounded-full border-2 border-ink bg-lime px-4 py-1.5 text-sm font-semibold text-ink"
          : "inline-flex items-center gap-2 rounded-full border-2 border-pa-red bg-pa-red/10 px-4 py-1.5 text-sm font-semibold text-pa-red"
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current inline-block" />
      {children}
    </div>
  );
}

/**
 * Estado de suscripción / prueba del club activo. Solo informativo.
 */
export function TrialBanner({
  clubCreatedAt,
  clubId,
}: {
  clubCreatedAt: string | null | undefined;
  clubId?: string | null;
}) {
  const subQ = useQuery({
    queryKey: ["club-subscription", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_subscription")
        .select("paid_until, blocked")
        .eq("club_id", clubId!)
        .maybeSingle();
      if (error) throw error;
      return data as { paid_until: string | null; blocked: boolean } | null;
    },
  });

  const paidUntil = subQ.data?.paid_until ?? null;

  if (paidUntil) {
    const left = daysUntil(paidUntil);
    if (left >= 0) {
      if (left > 7) {
        return <Chip tone="lime">Suscripción activa hasta {fmt(paidUntil)}</Chip>;
      }
      return (
        <div className="rounded-2xl border-2 border-pa-red bg-pa-red/10 p-4 md:p-5">
          <p className="font-display text-lg font-bold text-pa-red">
            Suscripción activa hasta {fmt(paidUntil)} · renueva pronto por Yappy
          </p>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm font-semibold underline text-ink"
          >
            Escríbenos para renovar
          </a>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border-2 border-pa-red bg-pa-red/10 p-4 md:p-5">
        <p className="font-display text-lg font-bold text-pa-red">
          Tu suscripción venció — renueva por Yappy
        </p>
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm font-semibold underline text-ink"
        >
          Escríbenos para renovar
        </a>
      </div>
    );
  }

  const daysLeft = trialDaysLeft(clubCreatedAt);
  if (daysLeft === null) return null;

  if (daysLeft > 7) {
    return <Chip tone="lime">Prueba gratis · te quedan {dias(daysLeft)}</Chip>;
  }

  const ended = daysLeft === 0;

  return (
    <div className="rounded-2xl border-2 border-pa-red bg-pa-red/10 p-4 md:p-5">
      <p className="font-display text-lg font-bold text-pa-red">
        {ended
          ? "Tu suscripción venció — renueva por Yappy"
          : `Te quedan ${dias(daysLeft)} de prueba gratis`}
      </p>
      <a
        href={WHATSAPP}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-sm font-semibold underline text-ink"
      >
        Escríbenos para continuar
      </a>
    </div>
  );
}
