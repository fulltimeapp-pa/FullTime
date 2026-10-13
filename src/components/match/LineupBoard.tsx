import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Wand2 } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import {
  FIELD_SIZES, FORMATIONS, autoPlace, defaultFormation, resolveSpots, saveLineupSettings, saveSpots,
  type FieldSize, type LineupSettings, type Spot,
} from "@/lib/alineacion";
import { Pitch } from "./Pitch";

export type BoardPlayer = { id: string; name: string; jersey: number | null; position: string | null; x: number | null; y: number | null };

/** "María Fernanda Pérez" → "María P." para que quepa en la cancha. */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.` : parts[0] ?? "";
}

/**
 * La alineación del partido para el cuerpo técnico: de cuántas se juega, el sistema, la cancha
 * para mover a cada titular y el interruptor para mostrarla (o no) a las jugadoras.
 */
export function LineupBoard({ callUpId, settings, titulares, ensureReport, onChanged }: {
  callUpId: string;
  settings: LineupSettings | null;
  titulares: BoardPlayer[];
  ensureReport: () => Promise<void>;
  onChanged: () => void;
}) {
  const size: FieldSize = settings?.field_size ?? 11;
  const formation = settings?.formation ?? defaultFormation(size);
  const published = settings?.lineup_published ?? false;
  const spots = resolveSpots(formation, titulares);
  const sinLugar = titulares.filter((t) => !spots[t.id]).length;

  const mut = useMutation({
    mutationFn: async (job: { settings?: Partial<LineupSettings>; replace?: string; move?: { id: string; spot: Spot } }) => {
      await ensureReport();
      if (job.settings) await saveLineupSettings(callUpId, job.settings);
      if (job.replace) {
        // Las que no caben en el sistema nuevo se quedan sin lugar, no encima de otra.
        const placed = autoPlace(job.replace, titulares);
        await saveSpots(callUpId, Object.fromEntries(titulares.map((t) => [t.id, placed[t.id] ?? null])));
      }
      if (job.move) await saveSpots(callUpId, { [job.move.id]: job.move.spot });
    },
    onSuccess: (_d, job) => {
      if (job.settings?.lineup_published === true) toast.success("Listo: las convocadas ya pueden ver la alineación");
      if (job.settings?.lineup_published === false) toast.success("La alineación quedó solo para el cuerpo técnico");
      onChanged();
    },
    onError: (e) => { toast.error(friendlyError(e, "No pudimos guardar la alineación. Vuelve a intentarlo.")); onChanged(); },
  });

  const chip = (on: boolean) => `rounded-full border-2 px-3 py-1.5 text-sm font-semibold ${on ? "border-ink bg-lime" : "border-ink/20 bg-paper"}`;

  return (
    <div className="mt-6 border-t-2 border-ink/10 pt-5">
      <h3 className="font-display text-lg font-bold">Alineación en la cancha</h3>
      <p className="text-sm text-ink/60">Elige el sistema y arrastra a cada titular a su lugar.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {FIELD_SIZES.map((n) => (
          <button key={n} type="button" disabled={mut.isPending} className={chip(size === n)}
            onClick={() => size !== n && mut.mutate({ settings: { field_size: n, formation: defaultFormation(n) }, replace: defaultFormation(n) })}>
            Fútbol {n}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {FORMATIONS[size].map((f) => (
          <button key={f} type="button" disabled={mut.isPending} className={`${chip(formation === f)} font-mono`}
            onClick={() => formation !== f && mut.mutate({ settings: { formation: f }, replace: f })}>
            {f}
          </button>
        ))}
      </div>

      {titulares.length === 0 ? (
        <p className="mt-4 rounded-xl border-2 border-dashed border-ink/25 bg-paper p-4 text-sm text-ink/60">
          Marca arriba quiénes son titulares y aparecen aquí en la cancha.
        </p>
      ) : (
        <>
          {titulares.length !== size && (
            <p className="mt-3 rounded-lg border-2 border-ink/20 bg-lime/30 px-3 py-2 text-sm font-medium">
              Tienes {titulares.length} {titulares.length === 1 ? "titular" : "titulares"} y en fútbol {size} van {size}.
              {sinLugar > 0 ? ` ${sinLugar} no ${sinLugar === 1 ? "cabe" : "caben"} en la cancha.` : ""}
            </p>
          )}
          <div className="mt-4">
            <Pitch
              players={titulares.filter((t) => spots[t.id]).map((t) => ({ id: t.id, name: shortName(t.name), jersey: t.jersey, ...spots[t.id] }))}
              onMove={(id, spot) => mut.mutate({ move: { id, spot } })}
            />
          </div>
          <div className="mt-3 flex justify-center">
            <button type="button" disabled={mut.isPending} onClick={() => mut.mutate({ replace: formation })}
              className="inline-flex items-center gap-1.5 text-sm font-semibold underline">
              <Wand2 size={14} /> Acomodarlas según el {formation}
            </button>
          </div>
        </>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-paper p-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            {published ? <Eye size={16} /> : <EyeOff size={16} />}
            {published ? "Las convocadas la pueden ver" : "Solo la ve el cuerpo técnico"}
          </p>
          <p className="text-xs text-ink/60">
            {published
              ? "La ven al abrir el partido: titulares en la cancha y suplentes. No se manda aviso al celular."
              : "Ármala con calma. Cuando esté lista, muéstrasela a las convocadas de este partido."}
          </p>
        </div>
        <button type="button" disabled={mut.isPending} onClick={() => mut.mutate({ settings: { lineup_published: !published } })}
          className={published ? "btn-ghost !py-2.5" : "btn-primary !py-2.5"}>
          {published ? "Dejar de mostrarla" : "Mostrar a las jugadoras"}
        </button>
      </div>
    </div>
  );
}
