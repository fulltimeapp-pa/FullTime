import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { Story } from "@/components/landing/Story";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { VoiceAgent } from "@/components/landing/VoiceAgent";
import { useReveal } from "@/hooks/use-reveal";
import heroAvif800 from "@/assets/hero-celebration-800.avif.asset.json";
import heroWebp1200 from "@/assets/hero-celebration-1200.webp.asset.json";

const PUBLISHED_URL = "https://fulltime-pa.lovable.app";
const heroOgImage = `${PUBLISHED_URL}${heroWebp1200.url}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FullTime — Dirige tu equipo de fútbol femenino, sin WhatsApp" },
      {
        name: "description",
        content:
          "FullTime centraliza convocatorias, entrenos, calendario y wellness para equipos de fútbol femenino en Panamá. Hecho para Profes de la Liga, academias y ligas aficionadas.",
      },
      { property: "og:title", content: "FullTime — Dirige tu equipo de fútbol femenino, sin WhatsApp" },
      {
        property: "og:description",
        content:
          "FullTime centraliza convocatorias, entrenos, calendario y wellness para equipos de fútbol femenino en Panamá. Hecho para Profes de la Liga, academias y ligas aficionadas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FullTime — Dirige tu equipo de fútbol femenino, sin WhatsApp" },
      {
        name: "twitter:description",
        content: "FullTime centraliza convocatorias, entrenos, calendario y wellness para equipos de fútbol femenino en Panamá. Hecho para Profes de la Liga, academias y ligas aficionadas.",
      },
      { property: "og:image", content: heroOgImage },
      { name: "twitter:image", content: heroOgImage },
    ],
    links: [
      { rel: "preload", as: "image", href: heroAvif800.url, type: "image/avif", fetchpriority: "high" },
    ],
  }),
  component: Index,
});

function Index() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <Pricing />
        <Story />
        <CTA />
      </main>
      <Footer />
      <VoiceAgent />
    </div>
  );
}
