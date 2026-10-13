import { useRef, useState } from "react";
import type { Spot } from "@/lib/alineacion";

export type PitchPlayer = { id: string; name: string; jersey: number | null; x: number; y: number; highlight?: boolean };

/**
 * La cancha con las titulares en su lugar (atacando hacia arriba). Si se pasa onMove, cada
 * jugadora se puede arrastrar con el dedo; al soltarla se avisa su lugar nuevo en % de la cancha.
 */
export function Pitch({ players, onMove }: { players: PitchPlayer[]; onMove?: (id: string, spot: Spot) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);

  function spotOf(e: React.PointerEvent): Spot {
    const r = box.current!.getBoundingClientRect();
    const pct = (v: number, size: number) => Math.min(96, Math.max(4, Math.round((v / size) * 1000) / 10));
    return { x: pct(e.clientX - r.left, r.width), y: pct(e.clientY - r.top, r.height) };
  }

  return (
    <div ref={box} className="relative mx-auto aspect-[3/4] w-full max-w-md select-none overflow-hidden rounded-2xl border-2 border-ink bg-ink">
      {/* Líneas de la cancha */}
      <svg viewBox="0 0 300 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <g fill="none" className="stroke-paper/35" strokeWidth={2}>
          <rect x="10" y="10" width="280" height="380" rx="4" />
          <line x1="10" y1="200" x2="290" y2="200" />
          <circle cx="150" cy="200" r="34" />
          <rect x="80" y="10" width="140" height="56" />
          <rect x="115" y="10" width="70" height="22" />
          <rect x="80" y="334" width="140" height="56" />
          <rect x="115" y="368" width="70" height="22" />
        </g>
      </svg>

      {players.map((p) => {
        const at = drag?.id === p.id ? drag : p;
        return (
          <div
            key={p.id}
            role={onMove ? "button" : undefined}
            aria-label={onMove ? `Mover a ${p.name}` : undefined}
            style={{ left: `${at.x}%`, top: `${at.y}%`, touchAction: onMove ? "none" : undefined }}
            className={`absolute flex w-[62px] -translate-x-1/2 -translate-y-1/2 flex-col items-center ${onMove ? "cursor-grab active:cursor-grabbing" : ""} ${drag?.id === p.id ? "z-10" : ""}`}
            onPointerDown={onMove ? (e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag({ id: p.id, ...spotOf(e) }); } : undefined}
            onPointerMove={onMove ? (e) => { if (drag?.id === p.id) setDrag({ id: p.id, ...spotOf(e) }); } : undefined}
            onPointerUp={onMove ? (e) => { if (drag?.id === p.id) { const s = spotOf(e); setDrag(null); onMove(p.id, s); } } : undefined}
            onPointerCancel={onMove ? () => setDrag(null) : undefined}
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-display text-base font-bold ${p.highlight ? "border-lime bg-paper text-ink ring-2 ring-lime" : "border-ink bg-lime text-ink"}`}>
              {p.jersey ?? p.name.charAt(0).toUpperCase()}
            </span>
            <span className="mt-0.5 max-w-full truncate rounded bg-ink/80 px-0.5 text-xs font-semibold leading-tight text-paper">{p.name}</span>
          </div>
        );
      })}
    </div>
  );
}
