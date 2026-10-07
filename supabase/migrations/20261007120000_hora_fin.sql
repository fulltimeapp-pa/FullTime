-- Hora de fin de partidos y entrenos (pedido de Bárbara, 7-oct).
-- Opcional: lo que ya existe queda sin hora de fin y se sigue mostrando solo el inicio.
ALTER TABLE public.call_ups ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.call_ups
  ADD CONSTRAINT call_ups_ends_after_starts CHECK (ends_at IS NULL OR ends_at > starts_at);
