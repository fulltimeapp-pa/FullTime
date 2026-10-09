import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";

const WHATSAPP = "https://wa.me/50769911552";
const CORREO = "fulltimeapp.pa@gmail.com";

type Para = "entrenador" | "jugadora";

export const Route = createFileRoute("/ayuda")({
  validateSearch: (s: Record<string, unknown>): { para?: Para } => ({
    para: s.para === "jugadora" ? "jugadora" : s.para === "entrenador" ? "entrenador" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "FullTime — Ayuda" },
      { name: "description", content: "Respuestas rápidas para entrenadores y jugadoras que usan FullTime." },
      { property: "og:title", content: "FullTime — Ayuda" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Ayuda,
});

type Pregunta = { q: string; a: ReactNode };

const B = ({ children }: { children: ReactNode }) => <b className="text-ink">{children}</b>;

const AVISOS_IPHONE: Pregunta = {
  q: "Uso iPhone y no me llegan los avisos",
  a: (
    <>
      <p>En iPhone los avisos solo llegan si FullTime está en tu pantalla de inicio:</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>Abre FullTime en <B>Safari</B> (no en Chrome ni dentro de WhatsApp).</li>
        <li>Toca <B>Compartir</B> (el cuadrito con la flecha) y elige <B>"Agregar a inicio"</B>.</li>
        <li>Abre FullTime desde el ícono nuevo y toca <B>"Activar avisos"</B>.</li>
      </ol>
      <p className="mt-2">Necesitas iOS 16.4 o más nuevo (Ajustes → General → Información).</p>
    </>
  ),
};

const AVISOS_ANDROID: Pregunta = {
  q: "Uso Android y no me llegan los avisos",
  a: (
    <>
      <p>Abre FullTime en <B>Chrome</B> y toca <B>"Activar avisos"</B> en tu pantalla de inicio de FullTime.</p>
      <p className="mt-2">
        Si alguna vez tocaste "Bloquear": toca el candado junto a la dirección de la página → <B>Permisos</B> →{" "}
        <B>Notificaciones</B> → <B>Permitir</B>. Revisa también que el ahorro de batería no esté cerrando Chrome.
      </p>
    </>
  ),
};

const OLVIDE: Pregunta = {
  q: "Olvidé mi contraseña",
  a: (
    <p>
      En la pantalla de entrar toca <B>"¿Olvidaste tu contraseña?"</B>, escribe tu correo y te llega un enlace para crear una
      nueva. Si entraste con Google, usa otra vez <B>"Continuar con Google"</B>.
    </p>
  ),
};

const ENTRENADOR: Pregunta[] = [
  {
    q: "¿Cómo invito a mis jugadoras?",
    a: (
      <p>
        Ve a <B>Plantel</B>, agrega a la jugadora con su nombre y su correo, y toca <B>"Invitar a la app"</B>. Mándale el
        enlace por WhatsApp: ella solo crea su contraseña y ya entra a tu equipo.
      </p>
    ),
  },
  {
    q: "¿Cómo convoco a un partido?",
    a: (
      <p>
        <B>Partidos</B> → <B>Nuevo partido</B>. Pon la fecha, la hora de convocatoria (a qué hora llegar), la hora del partido
        y el lugar, elige a quién convocas y toca <B>"Convocar y avisar al equipo"</B>. A cada jugadora le llega el aviso al
        celular.
      </p>
    ),
  },
  {
    q: "¿Cómo cargo todos los entrenos del mes de una vez?",
    a: (
      <p>
        <B>Entrenos</B> → <B>Nuevo</B> → <B>Varios días</B>. Elige los días de la semana (por ejemplo martes, jueves y viernes)
        con su horario y hasta qué fecha. Se crean todos juntos y a las jugadoras les llega un solo aviso.
      </p>
    ),
  },
  {
    q: "¿Cómo sé quién vio el aviso?",
    a: (
      <p>
        Abre la convocatoria. Ves quién <B>confirmó</B>, quién <B>no va</B> y por qué, quién <B>la abrió sin responder</B> y
        quién <B>no la ha abierto</B>. También ves a cuántos celulares les llegó el aviso.
      </p>
    ),
  },
  {
    q: "Algunas no responden. ¿Qué hago?",
    a: (
      <p>
        En la convocatoria toca <B>"Recordar a las que no han respondido"</B>: les vuelve a llegar el aviso solo a ellas.
        Además FullTime les recuerda solo la noche antes y 3 horas antes de la hora de convocatoria.
      </p>
    ),
  },
  {
    q: "Cambié la hora o el lugar. ¿Les aviso?",
    a: (
      <p>
        Sí, desde la misma convocatoria: toca <B>Editar</B>, cambia lo que necesites y guarda. FullTime les avisa del cambio a
        las convocadas.
      </p>
    ),
  },
  {
    q: "¿Cómo paso lista y veo la asistencia?",
    a: (
      <p>
        En cada convocatoria marcas quién asistió. En <B>Asistencia</B> ves el porcentaje de cada jugadora. Con{" "}
        <B>"Copiar lista"</B> la pegas en WhatsApp.
      </p>
    ),
  },
  {
    q: "¿Puedo sumar a mi asistente o preparador?",
    a: (
      <p>
        Sí. En <B>Equipo</B> invita a tu cuerpo técnico. Pueden crear y editar convocatorias y ver respuestas, pero solo tú
        manejas el club.
      </p>
    ),
  },
  AVISOS_IPHONE,
  AVISOS_ANDROID,
  OLVIDE,
];

const JUGADORA: Pregunta[] = [
  {
    q: "¿Cómo entro a mi equipo?",
    a: (
      <p>
        Abre el enlace que te mandó tu entrenador, crea tu contraseña y listo: ya estás en tu equipo. No tienes que buscar
        nada.
      </p>
    ),
  },
  {
    q: "¿Cómo confirmo si voy?",
    a: (
      <p>
        Toca el aviso que te llega (o entra a <B>Mis convocatorias</B>) y toca <B>"Voy"</B> o <B>"No puedo"</B>. Si no
        puedes, cuéntale el motivo a tu entrenador ahí mismo.
      </p>
    ),
  },
  {
    q: "Me equivoqué al responder",
    a: <p>Vuelve a abrir la convocatoria y cambia tu respuesta. Tu entrenador ve la última que marcaste.</p>,
  },
  {
    q: "¿Por qué me llegan recordatorios?",
    a: (
      <p>
        FullTime te recuerda la noche antes y 3 horas antes de la hora de convocatoria, para que no se te pase. Si respondiste
        "No puedo", no te llegan.
      </p>
    ),
  },
  AVISOS_IPHONE,
  AVISOS_ANDROID,
  OLVIDE,
  {
    q: "¿Quién ve mis datos?",
    a: (
      <p>
        Solo tu entrenador y su cuerpo técnico. Tus compañeras no ven tus respuestas. Más detalles en la{" "}
        <Link to="/privacidad" className="font-semibold underline">política de privacidad</Link>.
      </p>
    ),
  },
];

function Ayuda() {
  const { para = "entrenador" } = Route.useSearch();
  const preguntas = para === "jugadora" ? JUGADORA : ENTRENADOR;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-5 py-10 md:py-14">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = "/"))}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-ink"
        >
          <ArrowLeft size={16} /> Volver
        </button>

        <h1 className="mt-6 font-display text-4xl md:text-5xl font-bold leading-[0.95]">
          ¿En qué te <span className="marker-underline">ayudamos</span>?
        </h1>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border-2 border-ink bg-card p-1">
          {(["entrenador", "jugadora"] as Para[]).map((p) => (
            <Link
              key={p}
              to="/ayuda"
              search={{ para: p }}
              replace
              className={`rounded-xl py-3 text-center font-semibold transition-colors ${para === p ? "bg-ink text-lime" : "text-ink/70 hover:bg-ink/5"}`}
            >
              {p === "entrenador" ? "Soy entrenador" : "Soy jugadora"}
            </Link>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {preguntas.map((p) => (
            <details key={p.q} className="group rounded-2xl border-2 border-ink bg-card open:shadow-[4px_4px_0_0_var(--color-ink)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {p.q}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lime font-bold transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="px-5 pb-5 text-base leading-relaxed text-ink/80">{p.a}</div>
            </details>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border-2 border-ink bg-ink p-6 text-paper">
          <p className="font-display text-2xl font-bold">¿No encontraste tu respuesta?</p>
          <p className="mt-1 text-paper/70">Escríbenos y te ayudamos.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <MessageCircle size={18} /> WhatsApp +507 6991-1552
            </a>
            <a href={`mailto:${CORREO}`} className="text-sm font-semibold text-lime underline">{CORREO}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
