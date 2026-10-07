/**
 * Campos compartidos de una convocatoria (fecha, hora, lugar, nota y, en
 * entrenos, el objetivo). Los usan tanto la pantalla de crear partido como
 * la edición desde el detalle, para no duplicar el formulario.
 */

import { addMinutesToTime } from "@/lib/call-ups";

export type CallUpFieldsValue = {
  date: string;
  time: string;
  /** Hora de fin "HH:MM" (entrenos; opcional). */
  endTime: string;
  /** Hora de convocatoria "HH:MM" (partidos; opcional, antes del juego). */
  meetTime: string;
  place: string;
  note: string;
  objetivo: string;
};

export function CallUpFields({
  value,
  onChange,
  showObjetivo = false,
  disabled = false,
  kind = "entreno",
}: {
  value: CallUpFieldsValue;
  onChange: (patch: Partial<CallUpFieldsValue>) => void;
  showObjetivo?: boolean;
  disabled?: boolean;
  /** Partido: convocatoria + hora del juego. Entreno: empieza + termina. */
  kind?: "partido" | "entreno";
}) {
  return (
    <>
      <div>
        <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Fecha</label>
        <input
          type="date" required disabled={disabled}
          value={value.date} onChange={(e) => onChange({ date: e.target.value })}
          className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 font-semibold"
        />
      </div>
      {kind === "partido" ? (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Convocatoria</label>
          <input
            type="time" disabled={disabled}
            value={value.meetTime} onChange={(e) => onChange({ meetTime: e.target.value })}
            className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 font-semibold"
          />
          <p className="mt-1 text-xs text-ink/50">A qué hora llegar.</p>
        </div>
        <div>
          <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Empieza el partido</label>
          <input
            type="time" required disabled={disabled}
            value={value.time}
            onChange={(e) => {
              const time = e.target.value;
              // La convocatoria se sugiere 1 hora antes y acompaña al partido si no la tocaron.
              const sugerida = addMinutesToTime(value.time, -60);
              const meetTime = !value.meetTime || value.meetTime === sugerida ? addMinutesToTime(time, -60) : value.meetTime;
              onChange({ time, meetTime });
            }}
            className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 font-semibold"
          />
        </div>
      </div>
      ) : (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Empieza</label>
          <input
            type="time" required disabled={disabled}
            value={value.time}
            onChange={(e) => {
              const time = e.target.value;
              // Si la hora de fin estaba vacía o era la sugerida, se mueve junto con el inicio.
              const sugerida = addMinutesToTime(value.time, 90);
              const endTime = !value.endTime || value.endTime === sugerida ? addMinutesToTime(time, 90) : value.endTime;
              onChange({ time, endTime });
            }}
            className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 font-semibold"
          />
        </div>
        <div>
          <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Termina</label>
          <input
            type="time" disabled={disabled}
            value={value.endTime} onChange={(e) => onChange({ endTime: e.target.value })}
            className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 font-semibold"
          />
        </div>
      </div>
      )}

      <div>
        <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Lugar</label>
        <input
          type="text" required disabled={disabled}
          value={value.place} onChange={(e) => onChange({ place: e.target.value })}
          placeholder="Cancha del Maracaná, Panamá"
          className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3"
        />
      </div>

      {showObjetivo && (
        <div>
          <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Objetivo del entreno</label>
          <input
            type="text" disabled={disabled}
            value={value.objetivo} onChange={(e) => onChange({ objetivo: e.target.value })}
            placeholder="Salida con balón y presión alta"
            className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3"
          />
        </div>
      )}

      <div>
        <label className="text-xs font-mono uppercase tracking-wider text-ink/50">Nota (opcional)</label>
        <textarea
          value={value.note} onChange={(e) => onChange({ note: e.target.value })}
          rows={3} disabled={disabled}
          placeholder="Llegar 30 minutos antes. Traer camisa clara."
          className="mt-1.5 w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 resize-none"
        />
      </div>
    </>
  );
}
