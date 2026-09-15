import heroAvif480 from "@/assets/hero-celebration-480.avif.asset.json";
import heroAvif800 from "@/assets/hero-celebration-800.avif.asset.json";
import heroAvif1200 from "@/assets/hero-celebration-1200.avif.asset.json";
import heroWebp480 from "@/assets/hero-celebration-480.webp.asset.json";
import heroWebp800 from "@/assets/hero-celebration-800.webp.asset.json";
import heroWebp1200 from "@/assets/hero-celebration-1200.webp.asset.json";
import { useSession } from "@/hooks/use-session";

const heroAvifSet = `${heroAvif480.url} 480w, ${heroAvif800.url} 800w, ${heroAvif1200.url} 1200w`;
const heroWebpSet = `${heroWebp480.url} 480w, ${heroWebp800.url} 800w, ${heroWebp1200.url} 1200w`;
const heroSizes = "(min-width: 768px) 40vw, 92vw";

export function Hero() {
  const { isAuthenticated, loading } = useSession();
  return (
    <section className="relative overflow-hidden">
      {/* Decorative pitch lines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 600" fill="none">
          <path d="M0 500 Q400 300 800 500" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 8" />
          <path d="M0 550 Q400 380 800 560" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 8" />
          <circle cx="400" cy="500" r="80" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>

      <div className="mx-auto max-w-6xl px-5 pt-10 pb-16 md:pt-20 md:pb-28 grid md:grid-cols-12 gap-8 md:gap-10 items-center relative">
        {/* Left: copy */}
        <div className="md:col-span-7 relative z-10">
          <div className="flex items-center gap-3 mb-6 reveal">
            <span className="chip">
              <span className="h-1.5 w-1.5 rounded-full bg-pa-red inline-block" />
              Hecho en Panamá
              <span className="h-1.5 w-1.5 rounded-full bg-pa-blue inline-block" />
            </span>
            <span className="text-xs font-mono text-muted-foreground">v1.0 · beta abierta</span>
          </div>

          <h1 className="text-display text-[2.75rem] leading-[0.95] sm:text-6xl md:text-[5.5rem] font-extrabold reveal" data-delay="80">
            Deja el <em className="not-italic marker-underline">grupo de WhatsApp</em>.
            <br />
            Dirige tu equipo <span className="italic font-medium text-muted-foreground">de verdad.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg md:text-xl text-muted-foreground leading-relaxed reveal" data-delay="160">
            FullTime centraliza <strong className="text-foreground">convocatorias, entrenos, calendario y avisos al celular</strong> en una sola app.
            Hecha en Panamá, para el fútbol femenino de verdad — con la garra de tus jugadoras y el orden que tu cuerpo técnico merece.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3 reveal min-h-[48px]" data-delay="240">
            {loading ? null : isAuthenticated ? (
              <a href="/dashboard" className="btn-primary group">
                Ir a mi panel
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:translate-x-1">
                  <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ) : (
              <>
                <a href="/auth?mode=signup" className="btn-primary group">
                  Crear cuenta gratis
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:translate-x-1">
                    <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a href="/auth?mode=login" className="btn-ghost">Ya tengo cuenta</a>
              </>
            )}
          </div>

          <p className="mt-5 text-sm text-muted-foreground reveal" data-delay="320">
            <span className="font-mono text-foreground">✓</span> Sin lista de espera
            <span className="mx-2 opacity-40">·</span>
            <span className="font-mono text-foreground">✓</span> Sin aprobación
            <span className="mx-2 opacity-40">·</span>
            <span className="font-mono text-foreground">✓</span> Gratis para empezar
          </p>
        </div>

        {/* Right: hero image with decorative frame */}
        <div className="md:col-span-5 relative reveal" data-delay="200">
          <div className="relative">
            {/* Sticker: match card */}
            <div className="absolute -top-4 -left-4 z-20 rotate-[-6deg] bg-lime text-ink px-3 py-2 rounded-lg shadow-lg border-2 border-ink font-mono text-[11px] font-bold uppercase tracking-wider">
              Sáb · 4:30 pm
              <div className="text-[10px] font-sans normal-case tracking-normal opacity-70">Estadio Maracaná</div>
            </div>
            {/* Sticker: confirmations */}
            <div className="absolute -bottom-5 -right-3 z-20 rotate-[5deg] bg-paper text-ink px-3 py-2 rounded-lg shadow-lg border-2 border-ink">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-6 w-6 rounded-full border-2 border-paper" style={{ background: ["oklch(0.62 0.15 45)", "oklch(0.68 0.12 25)", "oklch(0.55 0.14 280)"][i] }} />
                  ))}
                </div>
                <div className="text-[11px] leading-tight">
                  <div className="font-bold">18 confirmadas</div>
                  <div className="text-muted-foreground text-[10px]">de 22 convocadas</div>
                </div>
              </div>
            </div>

            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border-2 border-ink shadow-[8px_8px_0_0_var(--color-ink)]">
              <picture>
                <source type="image/avif" srcSet={heroAvifSet} sizes={heroSizes} />
                <source type="image/webp" srcSet={heroWebpSet} sizes={heroSizes} />
                <img
                  src={heroWebp800.url}
                  alt="Selección femenina de Panamá celebrando un gol"
                  width={1200}
                  height={1467}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </picture>
              {/* Panama flag stripe */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 flag-stripe" />
            </div>
          </div>
        </div>
      </div>

      {/* Trusted-by-style marquee: teams / roles */}
      <div className="border-y-2 border-ink bg-ink text-paper overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-3.5 font-display font-medium text-sm tracking-wide">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex items-center gap-10 pr-10">
              {["Liga Femenina Panamá", "★", "Academias juveniles", "★", "Ligas aficionadas", "★", "Cuerpos técnicos", "★", "Profes en la cancha", "★"].map((t, i) => (
                <span key={`${k}-${i}`} className={t === "★" ? "text-lime" : ""}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
