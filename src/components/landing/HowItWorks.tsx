import huddleImg from "@/assets/team-huddle.jpg.asset.json";

const steps = [
  {
    n: "1",
    title: "Arma tu plantel",
    body: "Agregas a tus jugadoras y le mandas a cada una su enlace de invitación por WhatsApp. Ellas entran con un toque.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    ),
  },
  {
    n: "2",
    title: "Manda la convocatoria con un clic",
    body: "Elige rival, fecha y hora. Les llega un aviso al celular al instante — y un recordatorio antes del juego.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    ),
  },
  {
    n: "3",
    title: "Ellas confirman desde el celular",
    body: "Un toque: voy / no voy. Ves las respuestas en vivo, con motivo si no pueden.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7"><rect x="5" y="2" width="14" height="20" rx="3" stroke="currentColor" strokeWidth="1.8" /><path d="M9 18h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    ),
  },
  {
    n: "4",
    title: "Lleva el pulso del equipo",
    body: "Marca quién asistió de verdad, revisa bienestar (wellness) y esfuerzo (RPE), y ve todo en el calendario.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M7 15l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="como" className="relative py-20 md:py-32 bg-ink text-paper overflow-hidden">
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-64 h-64 flag-stripe opacity-[0.08] blur-3xl" />

      <div className="mx-auto max-w-6xl px-5 relative">
        <div className="grid md:grid-cols-12 gap-10 items-end mb-16">
          <div className="md:col-span-7">
            <span className="chip mb-6 reveal !bg-transparent !border-paper !text-paper">
              <span className="h-1.5 w-1.5 rounded-full bg-lime inline-block" />
              Cómo funciona
            </span>
            <h2 className="text-display text-4xl md:text-6xl font-bold reveal" data-delay="80">
              De la <span className="text-lime">idea</span> al<br />pitido inicial <span className="italic font-medium opacity-70">en 4 pasos.</span>
            </h2>
          </div>
          <div className="md:col-span-5 relative reveal" data-delay="160">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl border-2 border-paper/20 shadow-[6px_6px_0_0_var(--color-lime)]">
              <img
                src={huddleImg.url}
                alt="Selección femenina de Panamá en la cancha"
                width={1200}
                height={1408}
                loading="lazy"
                className="h-full w-full object-cover grayscale"
              />
            </div>
          </div>
        </div>

        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.n}
              className="reveal relative bg-paper/[0.03] border border-paper/15 rounded-2xl p-6 hover:bg-paper/[0.07] hover:border-lime/50 transition-all"
              data-delay={String(i * 90)}
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="font-display text-5xl font-extrabold text-lime leading-none">
                  {s.n}
                </span>
                <span className="h-10 w-10 rounded-full border border-paper/25 grid place-items-center text-paper">
                  {s.icon}
                </span>
              </div>
              <h3 className="text-lg font-display font-bold mb-2 leading-snug">{s.title}</h3>
              <p className="text-sm text-paper/70 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
