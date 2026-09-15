import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "FullTime — Entrando" },
      { name: "description", content: "Estamos terminando tu entrada a FullTime de forma segura." },
      { property: "og:title", content: "FullTime — Entrando" },
      { property: "og:description", content: "Estamos terminando tu entrada a FullTime de forma segura." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  const nextPath = () => {
    const saved = window.sessionStorage.getItem("fulltime_auth_redirect");
    window.sessionStorage.removeItem("fulltime_auth_redirect");
    if (saved && saved.startsWith("/") && !saved.startsWith("//")) return saved;
    return "/dashboard";
  };

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) navigate({ to: nextPath(), replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: nextPath(), replace: true });
    });
    return () => sub.data.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <p className="text-sm text-muted-foreground font-mono">Entrando a FullTime...</p>
    </div>
  );
}
