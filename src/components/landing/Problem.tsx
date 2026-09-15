const problems = [
  {
    n: "01",
    title: "Tu equipo vive en dos apps",
    body: "Los horarios llegan por WhatsApp y la convocatoria por otro lado. Nadie tiene la foto completa, y así una jugadora aparece el día que no era o con el uniforme equivocado.",
  },
  {
    n: "02",
    title: "Si no entras, no te enteras",
    body: "La app que ya usan no avisa de verdad. La convocatoria está publicada, pero sin notificación nadie la ve — y nadie agarra el hábito de abrirla.",
  },
  {
    n: "03",
    title: "El Profe vive escribiendo",
    body: "Entre la Liga Femenina y las categorías juveniles son más de 60 jugadoras. Horas cada día repitiendo el mismo mensaje una por una, en vez de preparar el próximo entreno.",
  },
];

export function Problem() {
  return (
    <section id="problema" className="relative py-20 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-3xl">
          <span className="chip mb-6 reveal">
            <span className="h-1.5 w-1.5 rounded-full bg-pa-red inline-block" />
            El problema
          </span>
          <h2 className="text-display text-4xl md:text-6xl font-bold mb-6 reveal" data-delay="80">
            Dirigir un equipo <br />no debería sentirse como <span className="italic text-pa-red">apagar incendios</span>.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl reveal" data-delay="160">
            Hablamos con entrenadores y jugadoras de la Liga Femenina y la Selección. Esto es lo que nos dijeron.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {problems.map((p, i) => (
            <article
              key={p.n}
              className="reveal group relative bg-card border-2 border-ink rounded-2xl p-6 md:p-7 transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_var(--color-ink)]"
              data-delay={String(i * 100)}
            >
              <div className="flex items-start justify-between mb-6">
                <span className="font-mono text-xs font-bold tracking-widest text-muted-foreground">{p.n}</span>
                <span className="h-8 w-8 rounded-full border-2 border-ink grid place-items-center text-lg group-hover:bg-lime transition-colors">
                  ✕
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-display font-bold leading-tight mb-3">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
