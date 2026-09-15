import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export type PlayerInvitePreview =
  | {
      ok: true;
      player_id: string;
      player_name: string;
      club_id: string;
      club_name: string;
      already_claimed: boolean;
      expired?: boolean;
      expected_email_masked?: string | null;
    }
  | { ok: false; reason: string };

export type StaffInvitePreview =
  | {
      ok: true;
      club_id: string;
      club_name: string;
      role: "admin" | "coach";
      already_accepted: boolean;
      expired?: boolean;
      expected_email_masked?: string | null;
    }
  | { ok: false; reason: string };

export type InviteSignupResult =
  | { ok: true; session: { access_token: string; refresh_token: string } | null }
  | {
      ok: false;
      reason: "not_found" | "already_claimed" | "expired" | "signup_failed" | "other";
      message?: string;
    };

// Public (no auth) by design: the invite landing pages call these before the
// user has an account. The database function stays token-gated; execute
// permission is restricted to service_role and calls are proxied here so the
// function is no longer exposed to the anon role through the API.
export const getPlayerInvite = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ token: z.string().trim().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("get_player_invite", {
      _token: data.token,
    });
    if (error || !result) return { ok: false, reason: "other" } as PlayerInvitePreview;
    // Defensa en profundidad: el correo completo jamás sale hacia el navegador,
    // sólo la versión enmascarada (expected_email_masked).
    const { player_email: _dropped, ...safe } = result as Record<string, unknown>;
    return safe as unknown as PlayerInvitePreview;
  });

export const getStaffInvite = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ token: z.string().trim().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("get_staff_invite", {
      _token: data.token,
    });
    if (error || !result) return { ok: false, reason: "other" } as StaffInvitePreview;
    return result as unknown as StaffInvitePreview;
  });

// Registro de jugadora con invitación: el correo real se resuelve en el
// servidor a partir del token y nunca se envía al navegador. La jugadora sólo
// escribe su contraseña; accept_player_invite sigue validando el correo.
export const signupWithPlayerInvite = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().trim().min(1).max(200),
        password: z.string().min(8).max(200),
        fullName: z.string().trim().min(1).max(120),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<InviteSignupResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: player, error: playerError } = await supabaseAdmin
      .from("players")
      .select("id, email, user_id, invite_expires_at")
      .eq("invite_token", data.token)
      .maybeSingle();

    if (playerError) return { ok: false, reason: "other" };
    if (!player) return { ok: false, reason: "not_found" };
    if (player.user_id) return { ok: false, reason: "already_claimed" };
    if (player.invite_expires_at && new Date(player.invite_expires_at).getTime() < Date.now()) {
      return { ok: false, reason: "expired" };
    }

    // Cliente con llave pública en el servidor: mismo comportamiento que el
    // signUp del navegador (respeta confirmación de correo y reglas de clave).
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const authClient = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
      email: player.email,
      password: data.password,
      options: { data: { full_name: data.fullName } },
    });
    if (signUpError) {
      return { ok: false, reason: "signup_failed", message: signUpError.message };
    }

    let session = signUpData.session;
    if (!session) {
      const { data: signInData } = await authClient.auth.signInWithPassword({
        email: player.email,
        password: data.password,
      });
      session = signInData.session;
    }

    return {
      ok: true,
      session: session
        ? { access_token: session.access_token, refresh_token: session.refresh_token }
        : null,
    };
  });
