import { useMemo, useState } from "react";
import type { BodySide, Laterality, Zone } from "@/lib/lesiones";
import { BODY_H, BODY_W, regionsFor } from "./body-regions";

export type BodyMarker = { id: string; x: number; y: number; n: number; active: boolean };
export type BodyTap = { x: number; y: number; zone?: Zone; laterality?: Laterality; name?: string };

/**
 * Figura del cuerpo propia de FullTime (frente o espalda), con cada grupo muscular como una pieza.
 * Al tocar una pieza se resalta y devuelve el punto (en % de la figura) y la zona exacta.
 * Las lesiones se pintan como puntos numerados (rojo = sigue lesionada, gris = con alta).
 */
export function BodyMap({ side, markers, onTap, onMarker }: {
  side: BodySide;
  markers: BodyMarker[];
  onTap?: (tap: BodyTap) => void;
  onMarker?: (id: string) => void;
}) {
  const regions = useMemo(() => regionsFor(side), [side]);
  const [hover, setHover] = useState<string | null>(null);
  const hovered = regions.find((r) => r.key === hover);

  function point(e: React.MouseEvent<SVGElement>) {
    const svg = e.currentTarget.ownerSVGElement ?? (e.currentTarget as unknown as SVGSVGElement);
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    const p = m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
    const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n * 10) / 10));
    return { x: clamp((p.x / BODY_W) * 100), y: clamp((p.y / BODY_H) * 100) };
  }

  return (
    <figure className="flex flex-col items-center">
      <svg
        viewBox={`-2 -2 ${BODY_W + 4} ${BODY_H + 4}`}
        role="img"
        aria-label={side === "frente" ? "Cuerpo de frente" : "Cuerpo de espalda"}
        className="h-80 w-auto select-none md:h-[26rem]"
        strokeLinejoin="round"
      >
        {/* Contorno: las mismas piezas con trazo grueso por debajo */}
        <g className="fill-ink stroke-ink" strokeWidth={2.6}>
          {regions.map((r) => <path key={r.key} d={r.d} />)}
        </g>
        {/* Piezas que se pueden tocar */}
        {regions.map((r) => (
          <g
            key={r.key}
            onClick={onTap ? (e) => onTap({ ...point(e), zone: r.zone, laterality: r.laterality, name: r.name }) : undefined}
            onMouseEnter={() => setHover(r.key)}
            onMouseLeave={() => setHover((h) => (h === r.key ? null : h))}
            className={onTap ? "cursor-pointer" : ""}
          >
            <title>{r.name}</title>
            <path d={r.d} className={`stroke-ink transition-colors ${hover === r.key && onTap ? "fill-lime" : "fill-[#E4E1D8]"}`} strokeWidth={0.7} />
            {r.lines.map((l, i) => (
              <path key={i} d={l} className="pointer-events-none fill-none stroke-ink/40" strokeWidth={0.55} strokeLinecap="round" />
            ))}
          </g>
        ))}
        {/* Lesiones */}
        {markers.map((m) => (
          <g
            key={m.id}
            onClick={(e) => { if (onMarker) { e.stopPropagation(); onMarker(m.id); } }}
            className={onMarker ? "cursor-pointer" : ""}
          >
            <circle cx={(m.x / 100) * BODY_W} cy={(m.y / 100) * BODY_H} r="5.2" className={`stroke-paper ${m.active ? "fill-pa-red" : "fill-ink/55"}`} strokeWidth={1.4} />
            <text x={(m.x / 100) * BODY_W} y={(m.y / 100) * BODY_H + 2.3} textAnchor="middle" className="pointer-events-none fill-paper" stroke="none" style={{ fontSize: 6.2, fontWeight: 700 }}>
              {m.n}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 h-4 text-xs font-mono uppercase tracking-wider text-ink/50">
        {hovered && onTap ? hovered.name : side === "frente" ? "De frente" : "De espalda"}
      </figcaption>
    </figure>
  );
}
