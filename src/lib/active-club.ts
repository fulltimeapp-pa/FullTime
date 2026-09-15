import { supabase } from "@/integrations/supabase/client";

export type ClubRole = "owner" | "admin" | "coach" | "jugadora";

export type ActiveClub = {
  club_id: string;
  role: ClubRole;
  club: {
    id: string;
    name: string;
    created_at: string | null;
    logo_path: string | null;
  } | null;
} | null;


export function isStaffRole(role: ClubRole | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "coach";
}

/**
 * Devuelve la membresía activa del usuario, SIN reparar/crear nada.
 * - Staff (owner/admin/coach) tiene prioridad sobre jugadora si por alguna
 *   razón el usuario tiene ambas filas.
 * - Si no tiene ninguna membresía → null (el onboarding la crea, solo para staff).
 * NUNCA llama a repair_my_club_membership: esa función es solo para staff y
 * upsertearía a la jugadora como 'admin', rompiendo su experiencia.
 */
export async function getMyActiveClub(): Promise<ActiveClub> {
  const { data: memberships, error: membershipError } = await supabase
    .from("club_members")
    .select("club_id, role, created_at")
    .order("created_at", { ascending: true });

  if (membershipError) {
    throw new Error("No pudimos cargar tu membresía del club.");
  }
  if (!memberships || memberships.length === 0) return null;

  const staff = memberships.find((m) =>
    ["owner", "admin", "coach"].includes(m.role as string),
  );
  const membership = staff ?? memberships[0];

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, name, created_at, logo_path")
    .eq("id", membership.club_id)
    .maybeSingle();

  if (clubError) {
    throw new Error("No pudimos cargar tu club.");
  }

  return {
    club_id: membership.club_id,
    role: membership.role as ClubRole,
    club: club
      ? {
          id: club.id,
          name: club.name,
          created_at: (club as any).created_at ?? null,
          logo_path: (club as any).logo_path ?? null,
        }
      : null,
  };

}

/** Días restantes de la prueba gratis (30 días desde la creación del club). */
export const TRIAL_DAYS = 30;

export function trialDaysLeft(createdAt: string | null | undefined): number | null {
  if (!createdAt) return null;
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return null;
  const end = start + TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const left = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  return left > 0 ? left : 0;
}
