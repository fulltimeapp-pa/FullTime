import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const given = request.headers.get("x-cron-secret");
        if (!secret || !given || given !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { runReminders } = await import("@/lib/reminders.server");
        const result = await runReminders();
        return Response.json(result);
      },
    },
  },
});
