import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CLUB_LOGOS_BUCKET = "club-logos";

/** Firma una ruta del bucket de escudos (bucket privado). */
export async function signClubLogo(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const { data } = await supabase.storage
    .from(CLUB_LOGOS_BUCKET)
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export function useClubLogoUrl(logoPath: string | null | undefined) {
  return useQuery({
    queryKey: ["club-logo-url", logoPath],
    enabled: !!logoPath,
    staleTime: 50 * 60 * 1000,
    queryFn: () => signClubLogo(logoPath ?? null),
  });
}

type Props = {
  logoPath: string | null | undefined;
  name: string | null | undefined;
  className?: string;
};

/** Escudo del club: imagen si existe, si no la inicial en un círculo lima. */
export function ClubCrest({ logoPath, name, className = "h-9 w-9" }: Props) {
  const { data: url } = useClubLogoUrl(logoPath);
  const initial = (name ?? "").trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink/15 bg-lime ${className}`}
      title={name ?? "Club"}
    >
      {url ? (
        <img
          src={url}
          alt={`Escudo de ${name ?? "tu club"}`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="font-display font-bold text-ink leading-none">{initial}</span>
      )}
    </span>
  );
}
