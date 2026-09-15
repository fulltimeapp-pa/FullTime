import { Logo } from "@/components/brand/Logo";
export function Footer() {
  return (
    <footer className="border-t-2 border-ink">
      <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <div className="grid md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-6">
            <div className="flex items-center gap-2 mb-3">
              <Logo className="h-9 w-9" />
              <span className="font-display text-lg font-bold">FullTime<span className="text-pa-red">.</span></span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              La app para digitalizar la logística del fútbol femenino en Panamá. Menos WhatsApp, más fútbol.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-mono">
              <span className="h-3 w-5 flag-stripe rounded-sm border border-ink" />
              Hecho con garra en Panamá
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Producto</div>
            <ul className="space-y-2 text-sm">
              <li><a href="#como" className="hover:underline underline-offset-4">Cómo funciona</a></li>
              <li><a href="#features" className="hover:underline underline-offset-4">Herramientas</a></li>
              <li><a href="/auth?mode=signup" className="hover:underline underline-offset-4">Crear cuenta</a></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Contacto</div>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:barbarchan2415@gmail.com" className="hover:underline underline-offset-4">barbarchan2415@gmail.com</a></li>
              <li><a href="https://wa.me/50769911552" target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-4">WhatsApp +507 6991-1552</a></li>
              <li><a href="https://instagram.com/fulltime.pa" target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-4">@fulltime.pa</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-ink/15 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
          <span>© {new Date().getFullYear()} FullTime · Todos los derechos reservados.</span>
          <span>v1.0 · Beta abierta</span>
        </div>
      </div>
    </footer>
  );
}
