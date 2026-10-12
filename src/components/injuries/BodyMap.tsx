import type { BodySide } from "@/lib/lesiones";

export type BodyMarker = { id: string; x: number; y: number; n: number; active: boolean };

const W = 100;
const H = 220;

/**
 * Figura del cuerpo propia de FullTime (frente o espalda). Al tocarla devuelve el punto en % de la
 * figura; las lesiones se pintan como puntos numerados (rojo = sigue lesionada, gris = con alta).
 */
export function BodyMap({ side, markers, onTap, onMarker }: {
  side: BodySide;
  markers: BodyMarker[];
  onTap?: (x: number, y: number) => void;
  onMarker?: (id: string) => void;
}) {
  function handle(e: React.MouseEvent<SVGSVGElement>) {
    if (!onTap) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    onTap(Math.min(100, Math.max(0, Math.round(x * 10) / 10)), Math.min(100, Math.max(0, Math.round(y * 10) / 10)));
  }

  const body = "fill-ink/10 stroke-ink";
  return (
    <figure className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        onClick={handle}
        role="img"
        aria-label={side === "frente" ? "Cuerpo de frente" : "Cuerpo de espalda"}
        className={`h-72 w-auto select-none md:h-80 ${onTap ? "cursor-crosshair" : ""}`}
        strokeWidth={1.2}
        strokeLinejoin="round"
      >
        {/* Cabeza y cuello */}
        <ellipse cx="50" cy="12" rx="9" ry="10.8" className={body} />
        <rect x="46" y="21.5" width="8" height="9" className={body} />
        {/* Brazos */}
        <path d="M32,31 Q24,32 23,42 L21,62 L19,88 Q18,99 20,106 Q23,109 25,105 L27,88 L30,64 L33,44 Z" className={body} />
        <path d="M68,31 Q76,32 77,42 L79,62 L81,88 Q82,99 80,106 Q77,109 75,105 L73,88 L70,64 L67,44 Z" className={body} />
        {/* Tronco */}
        <path d="M32,31 Q50,26 68,31 Q69,50 65,66 Q64,78 66,90 Q66,96 64.5,100 L35.5,100 Q34,96 34,90 Q36,78 35,66 Q31,50 32,31 Z" className={body} />
        {/* Piernas */}
        <path d="M35.5,100 L49.7,100 Q49.6,122 48.6,138 Q48.2,146 48,152 Q48.6,172 47,190 L46.4,204 Q48.6,210 49,216 L36.4,216 Q37.6,208 38.8,203 Q36.4,186 37.4,166 Q37.8,156 37,148 Q33.4,122 35.5,100 Z" className={body} />
        <path d="M64.5,100 L50.3,100 Q50.4,122 51.4,138 Q51.8,146 52,152 Q51.4,172 53,190 L53.6,204 Q51.4,210 51,216 L63.6,216 Q62.4,208 61.2,203 Q63.6,186 62.6,166 Q62.2,156 63,148 Q66.6,122 64.5,100 Z" className={body} />
        {/* Detalles para distinguir frente y espalda */}
        {side === "frente" ? (
          <g className="fill-none stroke-ink/40" strokeWidth={0.8}>
            <path d="M44,34 Q50,40 56,34" />
            <path d="M50,40 L50,84" strokeDasharray="1.5 3" />
            <circle cx="50" cy="76" r="0.9" className="fill-ink/40" />
            <path d="M43,144 Q43,148 43,150 M57,144 Q57,148 57,150" />
          </g>
        ) : (
          <g className="fill-none stroke-ink/40" strokeWidth={0.8}>
            <path d="M50,31 L50,92" />
            <path d="M39,42 Q44,50 41,58 M61,42 Q56,50 59,58" />
            <path d="M37,100 Q50,108 63,100" />
            <path d="M50,100 L50,108" />
          </g>
        )}
        {/* Lesiones */}
        {markers.map((m) => (
          <g
            key={m.id}
            onClick={(e) => { if (onMarker) { e.stopPropagation(); onMarker(m.id); } }}
            className={onMarker ? "cursor-pointer" : ""}
          >
            <circle cx={(m.x / 100) * W} cy={(m.y / 100) * H} r="5.5" className={`stroke-paper ${m.active ? "fill-pa-red" : "fill-ink/45"}`} strokeWidth={1.5} />
            <text x={(m.x / 100) * W} y={(m.y / 100) * H + 2.4} textAnchor="middle" className="fill-paper" stroke="none" style={{ fontSize: 6.5, fontWeight: 700 }}>
              {m.n}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 text-xs font-mono uppercase tracking-wider text-ink/50">
        {side === "frente" ? "De frente" : "De espalda"}
      </figcaption>
    </figure>
  );
}
