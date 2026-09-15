const WHATSAPP = "https://wa.me/50769911552";

type CuentaSuspendidaProps = {
  isStaff?: boolean;
};

/** Pantalla mostrada cuando el club del usuario está suspendido. */
export function CuentaSuspendida({ isStaff = true }: CuentaSuspendidaProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-2xl border-2 border-pa-red bg-pa-red/10 p-6 text-center">
        <h1 className="font-display text-2xl font-bold text-pa-red">
          {isStaff ? "Cuenta suspendida" : "Tu equipo está en pausa"}
        </h1>
        <p className="mt-3 text-sm font-medium text-ink">
          {isStaff
            ? "La cuenta de tu club está suspendida. Contacta a FullTime para reactivarla."
            : "Tu equipo no está activo por ahora. Escríbele a tu Profe para saber más."}
        </p>
        {isStaff && (
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-5 inline-block"
          >
            Escribir por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
