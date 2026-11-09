import { createFileRoute } from "@tanstack/react-router";

// Adonde Telegram manda lo que Bárbara le escribe a Jarvis y los botones que toca.
// Solo acepta pedidos con la contraseña del webhook; siempre responde 200 para que Telegram no reintente.
export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { esDeTelegram, handleTelegramUpdate } = await import("@/lib/hq-jarvis.server");
        if (!(await esDeTelegram(request.headers.get("x-telegram-bot-api-secret-token")))) {
          return new Response("Unauthorized", { status: 401 });
        }
        const update = await request.json().catch(() => null);
        if (update) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await handleTelegramUpdate(update, supabaseAdmin);
        }
        return new Response("ok");
      },
    },
  },
});
