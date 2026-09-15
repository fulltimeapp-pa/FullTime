import { useEffect, useState } from "react";
import { Bell, BellOff, Check, Share, Smartphone, X } from "lucide-react";
import { detectPlatform, isStandalone } from "@/lib/pwa";
import { enablePush, disablePush, isPushEnabled, pushSupported } from "@/lib/push";

export function PushOptIn() {
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showInstallSheet, setShowInstallSheet] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const iosNotInstalled = detectPlatform() === "ios" && !isStandalone();
      const ok = pushSupported();
      const on = ok ? await isPushEnabled() : false;
      if (!alive) return;
      setNeedsInstall(iosNotInstalled);
      setSupported(ok);
      setEnabled(on);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!ready) return null;
  if (!supported && !needsInstall) return null;

  async function turnOn() {
    setBusy(true);
    setError("");
    try {
      const state = await enablePush();
      if (state === "granted") setEnabled(true);
      else if (state === "denied")
        setError("No diste permiso. Actívalo en los ajustes de notificaciones de tu navegador.");
      else setError("Tu dispositivo no soporta notificaciones por ahora.");
    } catch {
      setError("No pudimos activar las notificaciones. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      await disablePush();
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }

  if (enabled) {
    return (
      <div className="rounded-2xl border-2 border-ink bg-lime/25 px-5 py-4 flex items-center justify-between gap-4">
        <p className="font-semibold flex items-center gap-2">
          <Check size={16} strokeWidth={3} /> Notificaciones activadas
        </p>
        <button
          onClick={turnOff}
          disabled={busy}
          className="text-xs font-semibold text-ink/60 underline underline-offset-2 inline-flex items-center gap-1"
        >
          <BellOff size={13} /> Desactivar
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border-2 border-ink bg-card p-5 shadow-[6px_6px_0_0_var(--color-lime)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime text-ink">
            {needsInstall ? <Smartphone size={18} /> : <Bell size={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold leading-tight">
              {needsInstall ? "Instala FullTime para recibir avisos" : "Activa las notificaciones"}
            </h3>
            <p className="mt-1 text-sm text-ink/70">
              {needsInstall
                ? "En iPhone las notificaciones solo llegan si agregas FullTime a tu pantalla de inicio: toca Compartir en Safari y elige “Agregar a inicio”."
                : "Activa las notificaciones para enterarte al instante de nuevas convocatorias y entrenos."}
            </p>

            {!needsInstall && (
              <button onClick={turnOn} disabled={busy} className="btn-primary mt-4 !py-2.5 !px-5 !text-sm inline-flex items-center gap-2">
                <Bell size={15} /> {busy ? "Activando..." : "Activar notificaciones"}
              </button>
            )}

            {needsInstall && (
              <button
                onClick={() => setShowInstallSheet(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-2"
              >
                <Share size={13} /> Ver cómo instalarla
              </button>
            )}

            {error && <p className="mt-3 text-sm font-medium text-pa-red">{error}</p>}
          </div>
        </div>
      </div>

      {showInstallSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInstallSheet(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border-2 border-ink bg-card p-6 shadow-[8px_8px_0_0_var(--color-lime)]">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-display text-xl font-bold">Instala FullTime en tu iPhone</h3>
              <button
                onClick={() => setShowInstallSheet(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink bg-paper hover:bg-lime transition-colors"
                aria-label="Cerrar"
              >
                <X size={14} />
              </button>
            </div>

            <ol className="mt-5 space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-ink">1</span>
                <p className="text-sm leading-relaxed text-ink/80">
                  Toca el botón <span className="font-semibold text-ink">Compartir</span> en la barra de Safari{" "}
                  <span className="inline-flex align-middle text-ink">
                    <Share size={14} />
                  </span>{" "}
                  (el cuadrito con la flecha hacia arriba ↑).
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-ink">2</span>
                <p className="text-sm leading-relaxed text-ink/80">
                  Desliza hacia abajo y toca <span className="font-semibold text-ink">“Agregar a inicio”</span> (Add to Home Screen).
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-ink">3</span>
                <p className="text-sm leading-relaxed text-ink/80">
                  Toca <span className="font-semibold text-ink">“Agregar”</span> arriba a la derecha.
                </p>
              </li>
            </ol>

            <div className="mt-5 rounded-xl border border-ink/20 bg-paper p-4">
              <p className="text-sm text-ink/80">
                Luego abre FullTime desde el ícono en tu pantalla de inicio y toca{" "}
                <span className="font-semibold text-ink">“Activar notificaciones”</span>.
              </p>
            </div>

            <button
              onClick={() => setShowInstallSheet(false)}
              className="btn-primary mt-5 w-full !py-3 !text-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
