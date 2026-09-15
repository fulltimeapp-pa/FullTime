import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";

type Props = {
  /** Preview URL of an existing photo (signed or blob URL). */
  currentUrl: string | null;
  /** Fallback text shown inside the empty circle (initials/dorsal). */
  fallback: string;
  /** Fires when the user finishes cropping a new photo. */
  onPicked: (blob: Blob) => void;
  /** Fires when the user removes the current photo. */
  onRemove: () => void;
  disabled?: boolean;
};

/**
 * Square-crop image picker. Opens a modal with drag + zoom, produces
 * a 512x512 JPEG Blob via canvas.
 */
export function PhotoCropInput({
  currentUrl,
  fallback,
  onPicked,
  onRemove,
  disabled,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rawUrl, setRawUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (rawUrl) URL.revokeObjectURL(rawUrl);
    };
  }, [rawUrl]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setRawUrl(url);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0 rounded-full overflow-hidden border-2 border-ink/15 bg-lime flex items-center justify-center">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt="Foto de la jugadora"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-display font-bold text-2xl text-ink">
            {fallback}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-paper hover:bg-ink hover:text-lime px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {currentUrl ? <Camera size={13} /> : <ImagePlus size={13} />}
            {currentUrl ? "Cambiar foto" : "Subir foto"}
          </button>
          {currentUrl && (
            <button
              type="button"
              disabled={disabled}
              onClick={onRemove}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 hover:border-pa-red hover:text-pa-red px-3 py-1.5 text-xs font-semibold text-ink/60 transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} /> Quitar
            </button>
          )}
        </div>
        <p className="text-[11px] text-ink/50">
          Opcional · JPG o PNG · se recorta en cuadrado
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {rawUrl && (
        <CropModal
          src={rawUrl}
          onCancel={() => setRawUrl(null)}
          onDone={(blob) => {
            setRawUrl(null);
            onPicked(blob);
          }}
        />
      )}
    </div>
  );
}

/* -------- Crop Modal -------- */

const CANVAS_SIZE = 512;
const BOX = 280; // preview square size in px

function CropModal({
  src,
  onCancel,
  onDone,
}: {
  src: string;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Natural image size
  const [nat, setNat] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  // Minimum scale so image covers the box
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  // Offset in px of the image's top-left corner relative to the box's top-left
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  }>({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const clamp = useCallback(
    (x: number, y: number, s: number) => {
      const w = nat.w * s;
      const h = nat.h * s;
      const minX = BOX - w;
      const minY = BOX - h;
      return {
        x: Math.min(0, Math.max(minX, x)),
        y: Math.min(0, Math.max(minY, y)),
      };
    },
    [nat],
  );

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const el = e.currentTarget;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    const m = Math.max(BOX / w, BOX / h);
    setNat({ w, h });
    setMinScale(m);
    setScale(m);
    // Center
    const cw = w * m;
    const ch = h * m;
    setOffset({ x: (BOX - cw) / 2, y: (BOX - ch) / 2 });
    setLoaded(true);
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
    };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(
      clamp(dragRef.current.baseX + dx, dragRef.current.baseY + dy, scale),
    );
  }
  function onPointerUp(e: React.PointerEvent) {
    dragRef.current.dragging = false;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {}
  }

  function handleScaleChange(next: number) {
    const s = Math.max(minScale, Math.min(minScale * 5, next));
    // Zoom around the center of the box
    const cx = BOX / 2;
    const cy = BOX / 2;
    const relX = (cx - offset.x) / scale;
    const relY = (cy - offset.y) / scale;
    const newX = cx - relX * s;
    const newY = cy - relY * s;
    setScale(s);
    setOffset(clamp(newX, newY, s));
  }

  async function done() {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    // The visible box shows the image at `scale`, offset by `offset`.
    // Source rect in natural coords:
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sw = BOX / scale;
    const sh = BOX / scale;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    canvas.toBlob(
      (blob) => {
        if (blob) onDone(blob);
      },
      "image/jpeg",
      0.88,
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm p-0 sm:p-6"
      onClick={onCancel}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border-2 border-ink bg-paper p-5 md:p-6 shadow-[6px_6px_0_0_var(--color-ink)] max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">Recorta la foto</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-ink/50 hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 flex flex-col items-center">
          <div
            className="relative rounded-full overflow-hidden border-2 border-ink bg-ink/5 touch-none select-none"
            style={{ width: BOX, height: BOX, maxWidth: "100%" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={onImageLoad}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: nat.w * scale,
                height: nat.h * scale,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                maxWidth: "none",
                userSelect: "none",
                pointerEvents: "none",
                opacity: loaded ? 1 : 0,
              }}
            />
          </div>

          <div className="mt-4 flex w-full items-center gap-3">
            <button
              type="button"
              onClick={() => handleScaleChange(scale - minScale * 0.2)}
              className="rounded-full border-2 border-ink/15 hover:border-ink p-2 text-ink/70 hover:text-ink"
              aria-label="Alejar"
            >
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min={minScale}
              max={minScale * 5}
              step={0.001}
              value={scale}
              onChange={(e) => handleScaleChange(Number(e.target.value))}
              className="flex-1 accent-ink"
            />
            <button
              type="button"
              onClick={() => handleScaleChange(scale + minScale * 0.2)}
              className="rounded-full border-2 border-ink/15 hover:border-ink p-2 text-ink/70 hover:text-ink"
              aria-label="Acercar"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <p className="mt-2 text-[11px] text-ink/50 text-center">
            Arrastra para mover · usa el control para acercar
          </p>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border-2 border-ink/20 hover:border-ink bg-paper px-4 py-3 text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={done}
            disabled={!loaded}
            className="btn-primary flex-1 !py-3 disabled:opacity-60"
          >
            Usar foto
          </button>
        </div>
      </div>
    </div>
  );
}
