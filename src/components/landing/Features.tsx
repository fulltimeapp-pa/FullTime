export function Features() {
  return (
    <section id="features" className="relative py-20 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-3xl mb-14">
          <span className="chip mb-6 reveal">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-deep inline-block" />
            Herramientas
          </span>
          <h2 className="text-display text-4xl md:text-6xl font-bold reveal" data-delay="80">
            Todo lo que tu cuerpo técnico<br />
            <span className="marker-underline">necesita</span>, sin lo que sobra.
          </h2>
        </div>

        {/* Bento grid — 4 cols x 4 rows, sin huecos */}
        <div className="grid gap-4 md:grid-cols-4 md:auto-rows-[13rem]">
          {/* 01 Convocatorias — destacada 2x2 */}
          <article className="reveal group md:col-span-2 md:row-span-2 bg-card border-2 border-ink rounded-2xl p-7 md:p-9 relative overflow-hidden hover:shadow-[8px_8px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition-all flex flex-col">
            <div className="chip mb-6 !text-[10px] self-start">01 · Estrella</div>
            <h3 className="text-display text-3xl md:text-4xl font-bold mb-4 leading-tight">
              Convocatorias con confirmación en vivo
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md">
              Convoca en 20 segundos. Ellas responden con un toque. Tú ves quién viene, quién no y por qué —
              antes de armar la alineación.
            </p>
            <div className="relative bg-paper border-2 border-ink rounded-xl p-4 shadow-[4px_4px_0_0_var(--color-ink)] max-w-sm mt-auto">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-muted-foreground font-mono">SÁB 15 MAR · 4:30 PM</div>
                  <div className="font-bold">vs FC Panteras</div>
                </div>
                <span className="text-xs font-bold bg-lime text-ink px-2 py-1 rounded-full border border-ink">EN VIVO</span>
              </div>
              <div className="space-y-2">
                {[
                  { name: "María C.", status: "voy", color: "bg-lime" },
                  { name: "Ana R.", status: "voy", color: "bg-lime" },
                  { name: "Luisa M.", status: "no puedo", color: "bg-muted" },
                  { name: "Sofía P.", status: "voy", color: "bg-lime" },
                ].map((r) => (
                  <div key={r.name} className="flex items-center justify-between text-sm border-t border-ink/10 pt-2">
                    <span className="font-medium">{r.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-ink ${r.color}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* 02 Plan de entreno — 2x1 lime */}
          <article className="reveal md:col-span-2 bg-lime border-2 border-ink rounded-2xl p-6 relative overflow-hidden hover:shadow-[6px_6px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition-all" data-delay="80">
            <div className="flex items-start justify-between gap-4 h-full">
              <div className="flex flex-col">
                <div className="chip mb-3 !bg-ink !text-lime !border-ink !text-[10px] self-start">02</div>
                <h3 className="text-display text-xl md:text-2xl font-bold mb-2 leading-tight text-ink">
                  Plan de entreno estructurado
                </h3>
                <p className="text-ink/80 text-sm max-w-md">
                  Partes iniciales, principales y finales. Actividades con duración e intensidad. Guarda plantillas y reutilízalas.
                </p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12 shrink-0 text-ink"><path d="M3 3v18h18M7 15V9m4 6V5m4 10v-8m4 8v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
          </article>

          {/* 03 Wellness — 1x1 */}
          <article className="reveal bg-card border-2 border-ink rounded-2xl p-5 hover:shadow-[6px_6px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition-all flex flex-col" data-delay="160">
            <div className="chip mb-3 !text-[10px] self-start">03</div>
            <h3 className="text-display text-lg font-bold mb-3">Wellness diario</h3>
            <div className="flex gap-1 mt-auto">
              {[4, 5, 3, 4, 5, 5, 4].map((v, i) => (
                <div key={i} className="flex-1 bg-cream rounded-sm relative h-12">
                  <div
                    className="absolute bottom-0 inset-x-0 bg-ink rounded-sm"
                    style={{ height: `${v * 18}%` }}
                  />
                </div>
              ))}
            </div>
          </article>

          {/* 04 Calendario — 1x1 ink */}
          <article className="reveal bg-ink text-paper border-2 border-ink rounded-2xl p-5 hover:shadow-[6px_6px_0_0_var(--color-lime)] hover:-translate-y-0.5 transition-all flex flex-col" data-delay="200">
            <div className="chip mb-3 !bg-transparent !border-paper !text-paper !text-[10px] self-start">04</div>
            <h3 className="text-display text-lg font-bold mb-3">Calendario</h3>
            <div className="grid grid-cols-7 gap-1 text-[9px] font-mono mt-auto">
              {Array.from({ length: 14 }).map((_, i) => {
                const isEvent = [2, 5, 9, 12].includes(i);
                return (
                  <div key={i} className={`aspect-square grid place-items-center rounded ${isEvent ? "bg-lime text-ink font-bold" : "bg-paper/10"}`}>
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </article>

          {/* 05 Avisos al celular — full width */}
          <article className="reveal md:col-span-4 relative bg-card border-2 border-ink rounded-2xl p-6 md:p-8 overflow-hidden hover:shadow-[6px_6px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition-all flex flex-col md:flex-row md:items-center md:gap-8" data-delay="240">
            <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-lime/40 blur-2xl" />
            <div className="relative md:flex-1">
              <div className="chip mb-3 !text-[10px]">05 · Diferencial</div>
              <h3 className="text-display text-xl md:text-2xl font-bold mb-2">Avisos reales al celular</h3>
              <p className="text-sm text-muted-foreground max-w-xl">
                Notificaciones push cuando sale la convocatoria o el entreno, más recordatorios la noche antes y horas
                antes del juego. Deja de perseguir a nadie por WhatsApp.
              </p>
            </div>
            <div className="text-xs bg-paper border-2 border-ink rounded-lg p-3 relative mt-4 md:mt-0 md:max-w-xs md:w-full shadow-[4px_4px_0_0_var(--color-ink)]">
              <div className="font-bold">Mañana hay partido</div>
              <div className="text-muted-foreground font-mono text-[11px]">4:30 p. m. · Estadio Maracaná</div>
            </div>
          </article>

          {/* 06 Próximamente — full width */}
          <article className="reveal md:col-span-4 bg-cream border-2 border-dashed border-ink/40 rounded-2xl p-6 md:p-7" data-delay="300">
            <div className="flex flex-col md:flex-row md:items-center md:gap-8">
              <div className="md:flex-1">
                <div className="chip mb-3 !text-[10px] !border-ink/40 !text-muted-foreground">En camino</div>
                <h3 className="text-display text-xl font-bold mb-1">Lo que viene</h3>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Todavía no están listas, pero ya vienen en camino. Te avisamos cuando las soltemos.
                </p>
              </div>
              <ul className="mt-4 md:mt-0 flex flex-wrap gap-2">
                {["Chat del equipo", "Asistente con IA", "Estadísticas y minutos", "Periodización (microciclos y carga)", "Biblioteca de tareas", "Pizarra táctica"].map((t) => (
                  <li key={t} className="text-xs font-semibold bg-paper border-2 border-ink/40 border-dashed rounded-full px-3 py-1.5">
                    {t} <span className="font-mono text-[10px] text-muted-foreground">— próximamente</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>

        </div>

        {/* Cita compacta */}
        <div className="mt-14 reveal">
          <figure className="relative mx-auto max-w-3xl bg-card border-2 border-ink rounded-2xl p-7 md:p-9 shadow-[6px_6px_0_0_var(--color-ink)]">
            <span aria-hidden className="absolute -top-6 left-6 text-display text-7xl font-bold text-lime-deep leading-none select-none">“</span>
            <blockquote className="text-display text-xl md:text-2xl font-bold leading-[1.25]">
              Le dedico horas cada día a escribirles a las jugadoras, una por una.
              Lo difícil no es entrenar — es <span className="marker-underline">comunicar</span> sin vivir pegado al teléfono.
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3 text-sm">
              <span className="h-1.5 w-6 bg-ink inline-block" />
              <span className="font-semibold">Entrenador de la Liga Femenina</span>
              <span className="text-muted-foreground">· Panamá</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
