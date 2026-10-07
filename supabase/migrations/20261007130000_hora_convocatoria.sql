-- Partidos: hora de convocatoria (a qué hora llegar), distinta de la hora del juego
-- (starts_at). Pedido de Bárbara, 7-oct. Opcional; debe ser antes o igual al inicio.
ALTER TABLE public.call_ups ADD COLUMN IF NOT EXISTS meet_at timestamptz;
ALTER TABLE public.call_ups
  ADD CONSTRAINT call_ups_meet_before_starts CHECK (meet_at IS NULL OR meet_at <= starts_at);
