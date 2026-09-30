import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const CONTACTO = "fulltimeapp.pa@gmail.com";
const ACTUALIZADA = "29 de septiembre de 2026";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "FullTime — Política de privacidad" },
      { name: "description", content: "Qué datos guarda FullTime, para qué los usa y cómo pedir que los borremos." },
      { property: "og:title", content: "FullTime — Política de privacidad" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Privacidad,
});

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold leading-tight">{titulo}</h2>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-ink/80">{children}</div>
    </section>
  );
}

function Privacidad() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-5 py-12 md:py-16">
        <Link to="/" className="font-display text-lg font-bold tracking-tight">
          FullTime<span className="text-pa-red">.</span>
        </Link>

        <h1 className="mt-8 font-display text-4xl md:text-5xl font-bold leading-[0.95]">
          Política de <span className="marker-underline">privacidad</span>
        </h1>
        <p className="mt-4 text-sm font-mono text-ink/60">Última actualización: {ACTUALIZADA}</p>

        <p className="mt-6 text-lg leading-relaxed">
          FullTime es una app para que entrenadores de fútbol femenino organicen su equipo: plantel,
          convocatorias, avisos al celular y confirmación de asistencia. Aquí te explicamos, sin letra
          chiquita, qué datos guardamos, para qué y cómo pedir que los borremos.
        </p>

        <Seccion titulo="Quién es responsable">
          <p>
            FullTime es un proyecto hecho en Panamá. Para cualquier tema de privacidad escríbenos a{" "}
            <a href={`mailto:${CONTACTO}`} className="font-semibold underline underline-offset-4">{CONTACTO}</a>.
          </p>
        </Seccion>

        <Seccion titulo="Qué datos guardamos">
          <p><strong>De entrenadores y cuerpo técnico:</strong> nombre, correo, contraseña (cifrada; nadie la puede leer) y el nombre del club.</p>
          <p>
            <strong>De jugadoras:</strong> los datos que el club carga en el plantel (nombre, correo, teléfono,
            fecha de nacimiento, posición, número de camiseta y foto, si la agregan), sus respuestas a
            convocatorias ("Voy" / "No puedo" y el motivo, si lo escribe), cuándo abrió cada convocatoria y
            la asistencia que marca el cuerpo técnico.
          </p>
          <p>
            <strong>Datos de bienestar:</strong> si el club lo activa en un entreno, la jugadora puede
            contar cómo durmió, su energía, su ánimo, su dolor muscular y qué tan duro sintió el entreno.
            Es información sobre su salud: solo la ve el cuerpo técnico de su club.
          </p>
          <p>
            <strong>Para los avisos al celular:</strong> si activas las notificaciones, guardamos un
            identificador técnico de tu navegador para poder enviártelas. No incluye tu número ni tus contactos.
          </p>
        </Seccion>

        <Seccion titulo="Para qué los usamos">
          <p>Solo para que la app funcione: armar el plantel, enviar convocatorias y recordatorios, registrar quién va y quién asistió.</p>
          <p>No vendemos datos. No mostramos publicidad. No usamos los datos para nada fuera de FullTime.</p>
        </Seccion>

        <Seccion titulo="Quién puede ver qué">
          <p><strong>El cuerpo técnico del club</strong> ve los datos de las jugadoras de su club.</p>
          <p>
            <strong>Cada jugadora</strong> ve su propia ficha y sus convocatorias. No ve el correo,
            teléfono ni fecha de nacimiento de sus compañeras.
          </p>
          <p><strong>Otros clubes</strong> no ven nada de tu club.</p>
        </Seccion>

        <Seccion titulo="Jugadoras menores de edad">
          <p>
            Muchas jugadoras son menores de edad. El club que las invita es responsable de contar con la
            autorización de su madre, padre o tutor antes de cargar sus datos en FullTime. Si eres madre,
            padre o tutor y quieres ver, corregir o borrar los datos de tu hija, escríbenos a{" "}
            <a href={`mailto:${CONTACTO}`} className="font-semibold underline underline-offset-4">{CONTACTO}</a>.
          </p>
        </Seccion>

        <Seccion titulo="Servicios que usamos">
          <p>Para funcionar, FullTime se apoya en estos servicios, que guardan o procesan datos por nosotros:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Supabase</strong>: base de datos y cuentas de usuario (servidores en Estados Unidos).</li>
            <li><strong>Vercel</strong>: aloja la página web (Estados Unidos).</li>
            <li><strong>Google</strong>: solo si eliges "Continuar con Google" para entrar.</li>
            <li><strong>Apple y Google</strong>: entregan los avisos al celular.</li>
            <li><strong>ElevenLabs</strong>: el asistente de voz de la página de inicio, solo si decides usarlo.</li>
          </ul>
        </Seccion>

        <Seccion titulo="Cuánto tiempo los guardamos">
          <p>
            Mientras tu cuenta o tu club estén activos. Si pides borrar tu cuenta, o el club borra a una
            jugadora del plantel, eliminamos sus datos de la app.
          </p>
        </Seccion>

        <Seccion titulo="Tus derechos">
          <p>
            Puedes pedirnos ver tus datos, corregirlos, borrarlos, oponerte a que los usemos o recibir una
            copia. Escríbenos a{" "}
            <a href={`mailto:${CONTACTO}`} className="font-semibold underline underline-offset-4">{CONTACTO}</a>{" "}
            y te respondemos.
          </p>
        </Seccion>

        <Seccion titulo="Cambios a esta política">
          <p>Si cambiamos algo importante, lo avisamos en la app y actualizamos la fecha de arriba.</p>
        </Seccion>

        <div className="mt-14 border-t border-ink/15 pt-6">
          <Link to="/" className="font-semibold underline underline-offset-4">Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
