import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";


function calcAcademia(n: number): number {
  if (n <= 0) return 0;
  let total = 9.99; // 1st
  if (n >= 2) {
    const tier2 = Math.min(n, 4) - 1; // teams 2..4
    total += tier2 * 7.99;
  }
  if (n >= 5) {
    total += (n - 4) * 6.99;
  }
  return Math.round(total * 100) / 100;
}


export function Pricing() {
  const [teams, setTeams] = useState(3);
  const total = useMemo(() => calcAcademia(teams), [teams]);

  return (
    <section id="precios" className="relative py-20 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-3xl mb-14">
          <span className="chip mb-6 reveal">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-deep inline-block" />
            Precios
          </span>
          <h2 className="text-display text-4xl md:text-6xl font-bold reveal" data-delay="80">
            Precios <span className="marker-underline">claros</span>,<br />
            sin letra chica.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground reveal" data-delay="140">
            Empieza gratis un mes. Sin tarjeta.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 items-stretch">
          {/* Plan Equipo */}
          <article className="reveal relative bg-card border-2 border-ink rounded-2xl p-8 md:p-10 flex flex-col hover:shadow-[6px_6px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition-all">
            <div className="chip mb-6 !text-[10px]">Plan Equipo</div>
            <div className="flex items-baseline gap-2">
              <span className="text-display text-6xl font-extrabold leading-none">$9.99</span>
              <span className="text-muted-foreground font-mono text-sm">/mes</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Para un equipo con su cuerpo técnico.
            </p>

            <ul className="mt-8 space-y-3 text-sm">
              <li className="flex gap-3">
                <Check /> Hasta <strong>25 jugadoras</strong>
              </li>
              <li className="flex gap-3">
                <Check /> <strong>2 cupos de staff</strong> (ej. entrenador + asistente o preparador)
              </li>
              <li className="flex gap-3">
                <Check /> Convocatorias, entrenos, asistencia y wellness
              </li>
            </ul>

            <div className="mt-auto pt-8">
              <a href="/auth?mode=signup" className="btn-ghost w-full">
                Empezar gratis
              </a>
              <p className="mt-3 text-xs text-muted-foreground font-mono text-center">
                1 mes gratis · sin tarjeta
              </p>
            </div>
          </article>

          {/* Plan Academia — highlighted */}
          <article className="reveal relative bg-ink text-paper border-2 border-ink rounded-2xl p-8 md:p-10 flex flex-col shadow-[8px_8px_0_0_var(--color-lime)] hover:-translate-y-0.5 transition-all overflow-hidden" data-delay="120">
            <div className="absolute top-0 left-0 right-0 h-1 flag-stripe" />
            <div className="absolute top-5 right-5">
              <span className="chip !bg-lime !border-ink !text-ink !text-[10px]">
                Más popular
              </span>
            </div>

            <div className="chip mb-6 !bg-transparent !border-paper !text-paper !text-[10px]">
              Plan Academia
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-paper/60 text-sm font-mono">Desde</span>
              <span className="text-display text-6xl font-extrabold leading-none text-lime">$9.99</span>
              <span className="text-paper/60 font-mono text-sm">/mes</span>
            </div>
            <p className="mt-3 text-sm text-paper/70">
              Para clubes con varios equipos, sin importar género ni categoría.
            </p>

            <ul className="mt-8 space-y-3 text-sm">
              <li className="flex gap-3">
                <Check tone="dark" /> <span><strong>1er equipo</strong> — $9.99/mes</span>
              </li>
              <li className="flex gap-3">
                <Check tone="dark" /> <span><strong>Equipos 2 a 4</strong> — $7.99/mes cada uno</span>
              </li>
              <li className="flex gap-3">
                <Check tone="dark" /> <span><strong>Del 5to en adelante</strong> — $6.99/mes cada uno</span>
              </li>
            </ul>

            {/* Calculator */}
            <div className="mt-8 bg-paper/[0.06] border border-paper/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="teams" className="text-xs font-mono uppercase tracking-wider text-paper/70">
                  ¿Cuántos equipos?
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTeams((n) => Math.max(1, n - 1))}
                    className="h-7 w-7 rounded-full border border-paper/30 hover:bg-paper hover:text-ink font-bold text-sm transition-colors"
                    aria-label="Menos equipos"
                  >
                    −
                  </button>
                  <input
                    id="teams"
                    type="number"
                    min={1}
                    max={50}
                    value={teams}
                    onChange={(e) => {
                      const v = parseInt(e.target.value || "1", 10);
                      if (!isNaN(v)) setTeams(Math.max(1, Math.min(50, v)));
                    }}
                    className="w-14 text-center bg-transparent border border-paper/30 rounded-md py-1 font-mono font-bold text-paper"
                  />
                  <button
                    type="button"
                    onClick={() => setTeams((n) => Math.min(50, n + 1))}
                    className="h-7 w-7 rounded-full border border-paper/30 hover:bg-paper hover:text-ink font-bold text-sm transition-colors"
                    aria-label="Más equipos"
                  >
                    +
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={Math.min(teams, 20)}
                onChange={(e) => setTeams(parseInt(e.target.value, 10))}
                className="w-full accent-lime"
                aria-label="Selector de cantidad de equipos"
              />
              <div className="mt-4 flex items-end justify-between">
                <div className="text-xs text-paper/60 font-mono">
                  Total mensual
                </div>
                <div className="text-display text-4xl font-extrabold text-lime leading-none">
                  ${total.toFixed(2)}
                  <span className="text-paper/60 text-sm font-mono font-normal">/mes</span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <a href="/auth?mode=signup" className="btn-primary w-full !bg-lime !text-ink hover:!shadow-[0_3px_0_0_var(--color-paper)]">
                Empezar gratis
              </a>
              <p className="mt-3 text-xs text-paper/60 font-mono text-center">
                1 mes gratis · sin tarjeta
              </p>
            </div>
          </article>
        </div>

        <div className="mt-10 flex justify-center reveal">
          <a
            href="https://calendly.com/barbarachan2415/fulltime-resuelve-tus-dudas"
            target="_blank"
            rel="noopener noreferrer"
            className="chip !bg-lime !text-ink !border-ink inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold hover:shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition-all"
          >
            <Calendar className="h-4 w-4" />
            ¿Prefieres hablarlo antes? Agenda una reunión gratis
          </a>
        </div>



        <p className="mt-10 text-center text-sm text-muted-foreground reveal">
          ¿Eres un club grande o una liga? Escríbeme a{" "}
          <a href="mailto:barbarchan2415@gmail.com" className="font-semibold text-ink underline underline-offset-4 decoration-lime decoration-2 hover:decoration-ink">
            barbarchan2415@gmail.com
          </a>{" "}
          o al WhatsApp{" "}
          <a href="https://wa.me/50769911552" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-4 decoration-lime decoration-2 hover:decoration-ink">
            +507 6991-1552
          </a>{" "}
          y armamos un plan a tu medida.
        </p>
      </div>
    </section>
  );
}

function Check({ tone = "light" }: { tone?: "light" | "dark" }) {
  const bg = tone === "dark" ? "bg-lime text-ink" : "bg-ink text-lime";
  return (
    <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full grid place-items-center ${bg}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
