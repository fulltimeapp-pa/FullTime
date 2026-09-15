import { useEffect, useState } from "react";
import { Share, PlusSquare, X, Download, Smartphone } from "lucide-react";
import { detectPlatform, isStandalone, type Platform } from "@/lib/pwa";

const KEY = "ft_install_prompt_v1";
const SNOOZE_DAYS = 5;

type Stored = { snoozedAt?: number; done?: boolean };

function read(): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Stored;
  } catch {
    return {};
  }
}
function write(v: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...v }));
  } catch {
    /* ignore */
  }
}

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    const p = detectPlatform();
    setPlatform(p);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    const onInstalled = () => {
      write({ done: true });
      setOpen(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    const s = read();
    const snoozeOk = !s.snoozedAt || Date.now() - s.snoozedAt > SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    // Sólo tiene sentido en celular (o si el navegador ofrece instalar).
    const t = window.setTimeout(() => {
      if (!s.done && snoozeOk && p !== "desktop") setOpen(true);
    }, 1400);

    return () => {
      window.clearTimeout(t);
      window.clearInterval(t);
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // En Android sin evento nativo aún, igual mostramos los pasos genéricos.
  if (!open) return null;

  function snooze() {
    write({ snoozedAt: Date.now() });
    setOpen(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") write({ done: true });
    else write({ snoozedAt: Date.now() });
    setDeferred(null);
    setOpen(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-5 animate-in slide-in-from-bottom duration-300">
      <div className="mx-auto max-w-md rounded-2xl border-2 border-ink bg-card p-5 shadow-[6px_6px_0_0_var(--color-lime)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-lime">
            <Smartphone size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold leading-tight">
              📲 Instala FullTime en tu teléfono
            </h3>
            <p className="mt-1 text-sm text-ink/70">
              Así lo abres de un toque y no te pierdes ninguna convocatoria.
            </p>

            {platform === "ios" ? (
              <ol className="mt-3 space-y-2 text-sm text-ink/80">
                <li className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-lime text-ink">
                    <Share size={13} />
                  </span>
                  1. Toca <strong>Compartir</strong> (el cuadrito con la flecha) abajo en Safari.
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-lime text-ink">
                    <PlusSquare size={13} />
                  </span>
                  2. Elige <strong>Agregar a inicio</strong> y listo.
                </li>
              </ol>
            ) : deferred ? (
              <button onClick={install} className="btn-primary mt-4 !py-2.5 !px-5 !text-sm inline-flex items-center gap-2">
                <Download size={15} /> Instalar app
              </button>
            ) : (
              <ol className="mt-3 space-y-2 text-sm text-ink/80">
                <li>1. Abre el menú <strong>⋮</strong> de Chrome, arriba a la derecha.</li>
                <li>
                  2. Toca <strong>Instalar app</strong> o <strong>Agregar a pantalla principal</strong>.
                </li>
              </ol>
            )}

            <button onClick={snooze} className="mt-3 text-xs font-semibold text-ink/50 underline underline-offset-2">
              Ahora no
            </button>
          </div>
          <button onClick={snooze} aria-label="Cerrar" className="text-ink/40 hover:text-ink">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
