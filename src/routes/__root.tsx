import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import "sonner/dist/styles.css";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { registerServiceWorker } from "../lib/pwa";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">No encontramos esta página</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Puede que el enlace esté mal copiado o que la página ya no exista.
        </p>
        <div className="mt-6">
          <Link to="/" className="btn-primary">
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  // Sin internet el celular no puede descargar la pantalla: lo decimos claro.
  const sinRed =
    (typeof navigator !== "undefined" && navigator.onLine === false) ||
    /failed to fetch|load failed|dynamically imported module|importing a module script|network/i.test(
      String((error as { message?: unknown })?.message ?? error),
    );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {sinRed ? "Sin conexión" : "No pudimos cargar esta página"}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {sinRed
            ? "Revisa tu internet y vuelve a intentarlo."
            : "Algo salió mal de nuestro lado. Vuelve a intentarlo o ve al inicio."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-primary"
          >
            Volver a intentar
          </button>
          <a href="/" className="btn-ghost">
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "author", content: "FullTime" },
      { name: "theme-color", content: "#F6F1E3" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "FullTime" },
      { name: "application-name", content: "FullTime" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "FullTime — Dirige tu equipo de fútbol femenino, sin WhatsApp" },
      { property: "og:title", content: "FullTime — Dirige tu equipo de fútbol femenino, sin WhatsApp" },
      { name: "twitter:title", content: "FullTime — Dirige tu equipo de fútbol femenino, sin WhatsApp" },
      { name: "description", content: "FullTime centraliza convocatorias, entrenos, calendario y wellness para equipos de fútbol femenino en Panamá. Hecho para Profes de la Liga, academias y ligas aficionadas." },
      { property: "og:description", content: "FullTime centraliza convocatorias, entrenos, calendario y wellness para equipos de fútbol femenino en Panamá. Hecho para Profes de la Liga, academias y ligas aficionadas." },
      { name: "twitter:description", content: "FullTime centraliza convocatorias, entrenos, calendario y wellness para equipos de fútbol femenino en Panamá. Hecho para Profes de la Liga, academias y ligas aficionadas." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c49062b9-964f-43af-9cb8-f3ef6234a0c4/id-preview-c8ce8bee--34e16961-0233-4dbe-8d39-c0a16ea10311.lovable.app-1784737855679.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c49062b9-964f-43af-9cb8-f3ef6234a0c4/id-preview-c8ce8bee--34e16961-0233-4dbe-8d39-c0a16ea10311.lovable.app-1784737855679.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { rel: "icon", href: "/favicon-192.png", type: "image/png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster
        position="bottom-center"
        toastOptions={{
          className: "border-2 border-ink bg-paper text-ink font-medium",
        }}
      />
    </QueryClientProvider>
  );
}
