/**
 * Campo de fecha de FullTime. Reemplaza al <input type="date"> del navegador, que muestra
 * la fecha según el idioma del navegador (mes/día/año en inglés) y se presta a confusión.
 * Aquí siempre se ve en español: "mié 8 oct 2026", con un calendario que empieza en lunes.
 * El valor sigue siendo "YYYY-MM-DD", igual que el input nativo.
 */
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function parseDay(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "mié 8 oct 2026" (o "8 oct 2010" sin día de la semana). */
export function formatDayEs(value: string, withWeekday = true): string {
  const d = parseDay(value);
  if (!d) return "";
  return format(d, withWeekday ? "EEE d MMM yyyy" : "d MMM yyyy", { locale: es }).replace(/\./g, "");
}

export function DateField({
  value,
  onChange,
  min,
  disabled = false,
  placeholder = "Elegir fecha",
  ariaLabel,
  className = "",
  birthday = false,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  /** Fecha de nacimiento: sin día de la semana y con selector de mes/año. */
  birthday?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDay(value);
  const minDate = min ? parseDay(min) : undefined;
  const thisYear = new Date().getFullYear();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={`flex w-full items-center justify-between gap-2 text-left disabled:opacity-60 ${className}`}
        >
          <span className={selected ? "" : "text-ink/40 font-normal"}>
            {selected ? formatDayEs(value, !birthday) : placeholder}
          </span>
          <CalendarDays size={18} className="shrink-0 text-ink/50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-2 border-ink" align="start">
        <Calendar
          mode="single"
          locale={es}
          weekStartsOn={1}
          selected={selected}
          defaultMonth={selected ?? (birthday ? new Date(thisYear - 15, 0, 1) : undefined)}
          disabled={minDate ? { before: minDate } : undefined}
          captionLayout={birthday ? "dropdown" : "label"}
          startMonth={birthday ? new Date(thisYear - 60, 0) : undefined}
          endMonth={birthday ? new Date(thisYear, 11) : undefined}
          onSelect={(d) => {
            if (d) {
              onChange(toDay(d));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
