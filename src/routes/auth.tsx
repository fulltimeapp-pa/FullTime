import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { getPlayerInvite, signupWithPlayerInvite } from "@/lib/invites.functions";
import { Logo } from "@/components/brand/Logo";

function translateAuthError(raw: string): string {
  const msg = (raw || "").toLowerCase();
  if (!raw) return "Algo salió mal. Vuelve a intentarlo.";
  if (msg.includes("weak") || msg.includes("easy to guess")) return "Esa contraseña es muy fácil de adivinar. Elige una más segura.";
  if (msg.includes("pwned") || msg.includes("breach") || msg.includes("leaked") || msg.includes("known to be")) return "Esa contraseña aparece en filtraciones públicas. Elige una más segura.";
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) return "Correo o contraseña incorrectos.";
  if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) return "Ya existe una cuenta con este correo. Inicia sesión.";
  if (msg.includes("email not confirmed")) return "Debes confirmar tu correo antes de entrar.";
  if (msg.includes("email") && msg.includes("invalid")) return "Escribe un correo válido.";
  if (msg.includes("rate limit") || msg.includes("too many")) return "Demasiados intentos. Espera un momento y vuelve a intentarlo.";
  if (msg.includes("password") && (msg.includes("short") || msg.includes("at least") || msg.includes("characters"))) return "La contraseña debe tener al menos 8 caracteres.";
  if (msg.includes("password")) return "La contraseña no cumple los requisitos. Usa 8+ caracteres, una mayúscula y un número.";
  if (msg.includes("network") || msg.includes("failed to fetch")) return "No hay conexión. Revisa tu internet y vuelve a intentarlo.";
  if (msg.includes("user not found")) return "No encontramos una cuenta con este correo.";
  return "No pudimos completar la acción. Vuelve a intentarlo.";
}

function passwordChecks(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
  };
}

function passwordValid(pw: string) {
  const c = passwordChecks(pw);
  return c.length && c.upper && c.number;
}

function PasswordRequirements({ pw }: { pw: string }) {
  const c = passwordChecks(pw);
  const items: [boolean, string][] = [
    [c.length, "Mínimo 8 caracteres"],
    [c.upper, "Al menos una mayúscula"],
    [c.number, "Al menos un número"],
  ];
  return (
    <ul className="mt-2 space-y-1">
      {items.map(([ok, label]) => (
        <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? "text-lime-deep font-medium" : "text-ink/50"}`}>
          {ok ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={2} />}
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  hasError?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={`${inputClass(!!hasError)} pr-12`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-ink/50 hover:text-ink transition-colors"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}


type Search = { mode?: "signup" | "login" | "reset"; redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "login" || s.mode === "reset" ? s.mode : "signup",
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "FullTime — Entra o crea tu cuenta" },
      {
        name: "description",
        content:
          "Accede a FullTime o crea tu cuenta gratis para organizar convocatorias, entrenos y asistencia de tu equipo de fútbol femenino.",
      },
      { property: "og:title", content: "FullTime — Entra o crea tu cuenta" },
      {
        property: "og:description",
        content: "Deja el caos de WhatsApp. Empieza a dirigir tu equipo con FullTime.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.1s2.69-6.1 6-6.1c1.88 0 3.15.8 3.87 1.49l2.64-2.55C16.86 3.36 14.66 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 12s4.1 9.6 9.2 9.6c5.31 0 8.83-3.73 8.83-8.98 0-.6-.07-1.06-.15-1.52H12z"
      />
    </svg>
  );
}

function AuthPage() {
  const { mode, redirect } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const safeRedirect = safeRedirectPath(redirect);
  const isInvite = typeof safeRedirect === "string" && safeRedirect.startsWith("/unirse/");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: safeRedirect ?? "/dashboard", replace: true });
    });
  }, [navigate, safeRedirect]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-5 py-10 md:py-16">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <Logo className="h-9 w-9" />
            <span className="font-display text-lg font-bold tracking-tight">
              FullTime<span className="text-pa-red">.</span>
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-paper px-3.5 py-1.5 text-sm font-semibold hover:bg-lime transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>


        <div className="rounded-2xl border-2 border-ink bg-card p-6 md:p-8 shadow-[6px_6px_0_0_var(--color-ink)]">
          {mode === "signup" && <SignupForm />}
          {mode === "login" && <LoginForm />}
          {mode === "reset" && <ResetForm />}
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signup" && !isInvite && (
            <>
              ¿Ya tienes cuenta?{" "}
              <Link to="/auth" search={{ mode: "login", redirect: safeRedirect }} className="font-semibold text-ink underline underline-offset-4 hover:text-lime-deep">
                Entra
              </Link>
            </>
          )}
          {mode === "login" && (
            <>
              ¿Aún no tienes cuenta?{" "}
              <Link to="/auth" search={{ mode: "signup", redirect: safeRedirect }} className="font-semibold text-ink underline underline-offset-4 hover:text-lime-deep">
                Regístrate gratis
              </Link>
            </>
          )}
          {mode === "reset" && (
            <>
              <Link to="/auth" search={{ mode: "login" }} className="font-semibold text-ink underline underline-offset-4 hover:text-lime-deep">
                Volver a entrar
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-sm font-medium text-pa-red">{msg}</p>;
}

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border-2 ${
    hasError ? "border-pa-red" : "border-ink/20 focus:border-ink"
  } bg-paper px-4 py-3 text-base outline-none transition-colors placeholder:text-ink/40`;
}

function safeRedirectPath(path?: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return undefined;
  return path;
}

async function googleSignIn(setError: (m: string) => void, redirect?: string) {
  const safeRedirect = safeRedirectPath(redirect);
  if (safeRedirect) {
    window.sessionStorage.setItem("fulltime_auth_redirect", safeRedirect);
  } else {
    window.sessionStorage.removeItem("fulltime_auth_redirect");
  }

  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin + "/auth/callback",
  });
  if (result.error) setError("No pudimos abrir Google. Vuelve a intentarlo.");
}

function GoogleButton({ label, onError, redirect }: { label: string; onError: (m: string) => void; redirect?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await googleSignIn(onError, redirect);
        setBusy(false);
      }}
      className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl border-2 border-ink bg-paper px-4 py-3 text-sm font-semibold transition-all hover:bg-ink hover:text-paper disabled:opacity-60"
    >
      <GoogleIcon />
      {busy ? "Abriendo Google..." : label}
    </button>
  );
}

function Divider({ label = "o con tu correo" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs font-mono uppercase text-ink/40">
      <span className="h-px flex-1 bg-ink/15" />
      <span className="whitespace-nowrap">{label}</span>
      <span className="h-px flex-1 bg-ink/15" />
    </div>
  );
}


// ---------- SIGNUP ----------
function SignupForm() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const safeRedirect = safeRedirectPath(redirect);
  const isInvite = typeof safeRedirect === "string" && safeRedirect.startsWith("/unirse/");
  const inviteToken = isInvite ? safeRedirect.slice("/unirse/".length).split(/[?#]/)[0] : null;
  const [fullName, setFullName] = useState("");
  const [clubName, setClubName] = useState("");
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    let alive = true;
    (async () => {
      try {
        const d = await getPlayerInvite({ data: { token: inviteToken } });
        if (!alive) return;
        if (d?.ok) {
          if ("player_name" in d && d.player_name) setFullName(d.player_name);
          // El correo real nunca llega al navegador: sólo mostramos la versión
          // enmascarada y el servidor resuelve el correo al crear la cuenta.
          if ("expected_email_masked" in d && d.expected_email_masked)
            setMaskedEmail(d.expected_email_masked);
        }
      } catch {
        // Sin conexión o función no disponible: el formulario sigue usable sin prellenado.
      }
    })();
    return () => {
      alive = false;
    };
  }, [inviteToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "Escribe tu nombre completo.";
    if (!isInvite && !clubName.trim()) errs.clubName = "Escribe el nombre de tu club.";
    if (!isInvite && (!email.trim() || !/^\S+@\S+\.\S+$/.test(email))) errs.email = "Escribe un correo válido.";
    if (!passwordValid(password)) errs.password = "La contraseña debe tener 8+ caracteres, una mayúscula y un número.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    setTopError("");
    try {
      await supabase.auth.signOut();

      if (isInvite && inviteToken) {
        // El correo real de la invitación se resuelve en el servidor a partir
        // del token; aquí sólo viaja el token, el nombre y la contraseña.
        const res = await signupWithPlayerInvite({
          data: { token: inviteToken, password, fullName: fullName.trim() },
        });
        if (!res?.ok) {
          const reason = (res as { reason?: string } | null)?.reason;
          setTopError(
            reason === "already_claimed"
              ? "Este enlace ya fue usado. Inicia sesión con tu cuenta."
              : reason === "expired"
                ? "Este enlace venció. Pídele a tu profe uno nuevo."
                : reason === "signup_failed"
                  ? translateAuthError((res as { message?: string }).message ?? "")
                  : "No pudimos crear tu cuenta. Vuelve a intentarlo.",
          );
          setSubmitting(false);
          return;
        }
        if (!res.session) {
          setTopError("Tu cuenta se creó. Revisa tu correo para confirmarla y luego inicia sesión.");
          setSubmitting(false);
          return;
        }
        const { error: sessionError } = await supabase.auth.setSession(res.session);
        if (sessionError) {
          setTopError("Tu cuenta se creó. Inicia sesión con tu correo y contraseña para continuar.");
          setSubmitting(false);
          return;
        }
        navigate({ to: safeRedirect!, replace: true });
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: window.location.origin,
        },
      });
      if (signUpError) {
        setTopError(translateAuthError(signUpError.message || ""));
        setSubmitting(false);
        return;
      }

      if (!signUpData.session) {
        await supabase.auth.signInWithPassword({ email: email.trim(), password });
      }

      const { error: rpcError } = await supabase.rpc("create_my_club", {
        _name: clubName.trim(),
      });
      if (rpcError) {
        setTopError("No pudimos crear tu club. Vuelve a intentarlo.");
        setSubmitting(false);
        return;
      }

      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      console.error(err);
      setTopError("No pudimos terminar el registro. Vuelve a intentarlo.");
      setSubmitting(false);
    }

  }

  return (
    <>
      <h1 className="font-display text-3xl md:text-4xl font-bold leading-none">
        {isInvite ? (
          <>Crea tu <span className="marker-underline">contraseña</span></>
        ) : (
          <>Crea tu <span className="marker-underline">club</span></>
        )}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {isInvite
          ? "Ya casi. Elige una contraseña para entrar a tu equipo."
          : "Empieza gratis. Sin tarjeta. Un minuto y estás dentro."}
      </p>

      <div className="mt-6">
        <GoogleButton label="Continuar con Google" onError={setTopError} redirect={safeRedirect} />
      </div>
      <Divider />

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5">Nombre completo</label>
          <input
            className={inputClass(!!errors.fullName)}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Bárbara Chan"
            autoComplete="name"
          />
          <FieldError msg={errors.fullName} />
        </div>
        {!isInvite && (
          <div>
            <label className="block text-sm font-semibold mb-1.5">Nombre del club</label>
            <input
              className={inputClass(!!errors.clubName)}
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Panteras FC"
              autoComplete="organization"
            />
            <FieldError msg={errors.clubName} />
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold mb-1.5">Correo</label>
          <input
            type="email"
            className={`${inputClass(!!errors.email)}${isInvite ? " opacity-60 cursor-not-allowed bg-ink/5" : ""}`}
            value={isInvite ? maskedEmail : email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isInvite ? "El correo de tu invitación" : "tu@correo.com"}
            autoComplete="email"
            readOnly={isInvite}
            tabIndex={isInvite ? -1 : undefined}
          />
          <FieldError msg={errors.email} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5">Contraseña</label>
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            hasError={!!errors.password}
          />
          {errors.password && <FieldError msg={errors.password} />}
          <PasswordRequirements pw={password} />
        </div>


        {topError && (
          <div className="rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
            {topError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full !py-3.5 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Creando cuenta..."
            : isInvite
              ? "Entrar a mi equipo"
              : "Crear cuenta gratis"}
        </button>
      </form>
    </>
  );
}

// ---------- LOGIN ----------
function LoginForm() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const safeRedirect = safeRedirectPath(redirect);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const errs: Record<string, string> = {};
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) errs.email = "Escribe un correo válido.";
    if (!password) errs.password = "Escribe tu contraseña.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    setTopError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setTopError(translateAuthError(error.message || ""));
      setSubmitting(false);
      return;
    }

    navigate({ to: safeRedirect ?? "/dashboard", replace: true });
  }

  return (
    <>
      <h1 className="font-display text-3xl md:text-4xl font-bold leading-none">
        Entra a <span className="marker-underline">FullTime</span>
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">Dirige tu equipo desde un solo lugar.</p>

      <div className="mt-6">
        <GoogleButton label="Continuar con Google" onError={setTopError} redirect={safeRedirect} />
      </div>
      <Divider />

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5">Correo</label>
          <input
            type="email"
            className={inputClass(!!errors.email)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            autoComplete="email"
          />
          <FieldError msg={errors.email} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold">Contraseña</label>
            <Link
              to="/auth"
              search={{ mode: "reset" }}
              className="text-xs font-semibold text-ink/70 hover:text-lime-deep underline underline-offset-4"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <PasswordInput
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            hasError={!!errors.password}
          />

          <FieldError msg={errors.password} />
        </div>

        {topError && (
          <div className="rounded-lg border-2 border-pa-red bg-pa-red/10 px-3 py-2 text-sm font-medium text-pa-red">
            {topError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full !py-3.5 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="mt-5 rounded-xl border-2 border-ink/15 bg-paper px-4 py-3 text-center">
        <p className="text-sm text-ink/70">¿Es otro correo el que quieres usar?</p>
        <Link
          to="/auth"
          search={{ mode: "signup", redirect: safeRedirect }}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl border-2 border-ink bg-lime px-4 py-2.5 text-sm font-bold hover:shadow-[3px_3px_0_0_var(--color-ink)] transition-shadow"
        >
          Crear una cuenta nueva
        </Link>
      </div>

    </>
  );
}

// ---------- RESET ----------
function ResetForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Escribe un correo válido.");
      return;
    }
    setSubmitting(true);
    setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (err) setError(translateAuthError(err.message || ""));
    else setSent(true);
    setSubmitting(false);
  }

  return (
    <>
      <h1 className="font-display text-3xl md:text-4xl font-bold leading-none">
        Recupera tu <span className="marker-underline">contraseña</span>
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Te mandamos un enlace para crear una nueva.
      </p>

      {sent ? (
        <div className="mt-6 rounded-xl border-2 border-ink bg-lime/20 p-4 text-sm font-medium">
          Listo. Revisa tu correo y sigue el enlace para elegir una nueva contraseña.
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Correo</label>
            <input
              type="email"
              className={inputClass(!!error)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
            />
            <FieldError msg={error} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full !py-3.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>
      )}
    </>
  );
}
