import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildBulkTrainingMessage,
  buildCallUpMessage,
  sendToSubscriptions,
  type CallUpMessageKind,
} from "./push-notify.server";

// Sólo se permiten avisos ligados a una convocatoria/entreno real. No existe
// ninguna vía para que un usuario envíe texto o enlaces arbitrarios a otros
// usuarios: el mensaje se construye en el servidor a partir de la convocatoria.
// Solo el cuerpo técnico del club puede dispararlos.
const inputSchema = z.object({
  call_up_id: z.string().uuid(),
  // "new" (por defecto) = nueva convocatoria; "updated" = cambió fecha/hora/lugar;
  // "reminder" = recordatorio a las que no han respondido.
  kind: z.enum(["new", "updated", "reminder"]).optional(),
  // Compatibilidad: updated=true equivale a kind="updated".
  updated: z.boolean().optional(),
  // Solo a estas jugadoras (deben estar en la convocatoria).
  player_ids: z.array(z.string().uuid()).max(200).optional(),
  // Solo a las que siguen sin responder.
  only_pending: z.boolean().optional(),
});

export type SendPushResult = {
  /** Jugadoras a las que les correspondía el aviso. */
  targeted: number;
  /** De esas, cuántas tienen los avisos activados en algún celular. */
  reachable: number;
  /** Celulares a los que el aviso salió bien. */
  sent: number;
  failed: number;
};

export const sendPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<SendPushResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const empty: SendPushResult = { targeted: 0, reachable: 0, sent: 0, failed: 0 };

    // RLS del usuario: sólo puede disparar avisos de convocatorias que puede ver.
    const { data: cu, error } = await context.supabase
      .from("call_ups")
      .select("id, club_id, kind, starts_at, ends_at, place, objetivo")
      .eq("id", data.call_up_id)
      .maybeSingle();
    if (error) throw error;
    if (!cu) return empty;

    // Y además tiene que ser del cuerpo técnico de ese club.
    const { data: isStaff, error: staffErr } = await context.supabase.rpc("is_club_staff", {
      _user_id: context.userId,
      _club_id: cu.club_id,
    });
    if (staffErr) throw staffErr;
    if (!isStaff) throw new Error("Solo el cuerpo técnico puede enviar avisos.");

    const kind: CallUpMessageKind = data.kind ?? (data.updated ? "updated" : "new");
    const message = buildCallUpMessage(cu as any, kind);

    const { data: rows, error: rErr } = await supabaseAdmin
      .from("call_up_players")
      .select("player_id, status, players(user_id)")
      .eq("call_up_id", data.call_up_id);
    if (rErr) throw rErr;

    const wanted = data.player_ids ? new Set(data.player_ids) : null;
    const targets = (rows ?? []).filter(
      (r: any) =>
        (!wanted || wanted.has(r.player_id)) && (!data.only_pending || r.status === "pending"),
    );
    const userIds = Array.from(
      new Set(
        targets
          .map((r: any) => r.players?.user_id as string | null)
          .filter((v: string | null): v is string => !!v && v !== context.userId),
      ),
    );

    if (userIds.length === 0) return { ...empty, targeted: targets.length };

    const { data: subs, error: sErr } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    if (sErr) throw sErr;

    const reachable = new Set((subs ?? []).map((s: any) => s.user_id as string)).size;
    const res = await sendToSubscriptions((subs ?? []) as any, message, async (ids) => {
      await supabaseAdmin.from("push_subscriptions").delete().in("id", ids);
    });
    return { targeted: targets.length, reachable, ...res };
  });

// Varios entrenos creados de una vez: un solo aviso por jugadora.
const bulkSchema = z.object({
  call_up_ids: z.array(z.string().uuid()).min(1).max(60),
});

export const sendPushBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bulkSchema.parse(data))
  .handler(async ({ data, context }): Promise<SendPushResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const empty: SendPushResult = { targeted: 0, reachable: 0, sent: 0, failed: 0 };

    // RLS del usuario: solo ve convocatorias de su club.
    const { data: cus, error } = await context.supabase
      .from("call_ups")
      .select("id, club_id, starts_at")
      .in("id", data.call_up_ids);
    if (error) throw error;
    if (!cus || cus.length === 0) return empty;

    // Tiene que ser cuerpo técnico de cada club involucrado (normalmente uno).
    for (const clubId of new Set(cus.map((c) => c.club_id as string))) {
      const { data: isStaff, error: staffErr } = await context.supabase.rpc("is_club_staff", {
        _user_id: context.userId,
        _club_id: clubId,
      });
      if (staffErr) throw staffErr;
      if (!isStaff) throw new Error("Solo el cuerpo técnico puede enviar avisos.");
    }

    const message = buildBulkTrainingMessage(cus.map((c) => c.starts_at as string));

    const { data: rows, error: rErr } = await supabaseAdmin
      .from("call_up_players")
      .select("player_id, players(user_id)")
      .in("call_up_id", cus.map((c) => c.id as string));
    if (rErr) throw rErr;

    const targeted = new Set((rows ?? []).map((r: any) => r.player_id as string)).size;
    const userIds = Array.from(
      new Set(
        (rows ?? [])
          .map((r: any) => r.players?.user_id as string | null)
          .filter((v: string | null): v is string => !!v && v !== context.userId),
      ),
    );
    if (userIds.length === 0) return { ...empty, targeted };

    const { data: subs, error: sErr } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    if (sErr) throw sErr;

    const reachable = new Set((subs ?? []).map((s: any) => s.user_id as string)).size;
    const res = await sendToSubscriptions((subs ?? []) as any, message, async (ids) => {
      await supabaseAdmin.from("push_subscriptions").delete().in("id", ids);
    });
    return { targeted, reachable, ...res };
  });
