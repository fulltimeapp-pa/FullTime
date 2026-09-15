import barbaraAsset from "@/assets/barbara.jpg.asset.json";

export function Story() {
  return (
    <section id="historia" className="relative py-20 md:py-32 bg-cream/60">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-center">
          {/* Photo */}
          <div className="md:col-span-5 reveal">
            <div className="relative">
              <div className="absolute -inset-3 bg-lime rounded-2xl rotate-[-2deg]" aria-hidden />
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-[8px_8px_0_0_var(--color-ink)]">
                <img
                  src={barbaraAsset.url}
                  alt="Bárbara, fundadora de FullTime, en la cancha de fútbol"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="absolute -bottom-3 -right-3 chip !bg-paper shadow-[3px_3px_0_0_var(--color-ink)]">
                <span className="h-1.5 w-1.5 rounded-full bg-pa-red inline-block" />
                Fundadora
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="md:col-span-7 reveal" data-delay="120">
            <span className="chip mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-deep inline-block" />
              Historia
            </span>
            <h2 className="text-display text-4xl md:text-5xl font-bold leading-[1.02] mb-8">
              Soy Bárbara, y esto<br />
              nació de la <span className="marker-underline">cancha.</span>
            </h2>

            <div className="space-y-5 text-lg leading-relaxed text-ink/85 max-w-2xl">
              <p>
                Llevo jugando fútbol desde que tengo memoria. Siempre he creído que el fútbol femenino en Panamá tiene mucho más potencial del que se ve — lo que falta son recursos y herramientas para que crezca.
              </p>
              <p>
                Dos operaciones de rodilla me obligaron a parar y a repensar mi relación con el fútbol, y a buscar otras formas de seguir aportando desde otro lugar. FullTime es una de ellas: una manera de ayudar a los clubes a organizarse mejor y a gastar su energía en lo que de verdad importa — jugar.
              </p>
              <p className="font-display text-2xl md:text-3xl font-bold leading-snug text-ink border-l-4 border-lime pl-5">
                No pretendo tener la fórmula perfecta. Solo quiero que, de alguna forma, el fútbol femenino en Panamá siga creciendo.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground font-mono">
              <span className="h-px w-10 bg-ink/30" />
              Bárbara · Ciudad de Panamá
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
