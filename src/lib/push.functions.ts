import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildCallUpMessage, sendToSubscriptions } from "./push-notify.server";

// Sólo se permiten avisos ligados a una convocatoria/entreno real. No existe
// ninguna vía para que un usuario envíe texto o enlaces arbitrarios a otros
// usuarios: el mensaje se construye en el servidor a partir de la convocatoria
// y la autorización la da la RLS del propio usuario sobre esa convocatoria.
const inputSchema = z.object({ call_up_id: z.string().uuid() });

export const sendPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // RLS del usuario: sólo puede disparar avisos de convocatorias que puede ver.
    const { data: cu, error } = await context.supabase
      .from("call_ups")
      .select("id, kind, starts_at, place, objetivo")
      .eq("id", data.call_up_id)
      .maybeSingle();
    if (error) throw error;
    if (!cu) return { sent: 0, failed: 0 };

    const message = buildCallUpMessage(cu as any);

    const { data: rows, error: rErr } = await supabaseAdmin
      .from("call_up_players")
      .select("players(user_id)")
      .eq("call_up_id", data.call_up_id);
    if (rErr) throw rErr;
    const userIds = (rows ?? [])
      .map((r: any) => r.players?.user_id as string | null)
      .filter((v: string | null): v is string => !!v && v !== context.userId);

    if (userIds.length === 0) return { sent: 0, failed: 0 };

    const { data: subs, error: sErr } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    if (sErr) throw sErr;

    return await sendToSubscriptions((subs ?? []) as any, message, async (ids) => {
      await supabaseAdmin.from("push_subscriptions").delete().in("id", ids);
    });
  });
