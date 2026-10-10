-- Wellness y RPE, parte 2: recordatorio automático (decidido con Bárbara el 9-oct).
-- Marca a quién ya se le mandó, para que cada jugadora reciba como mucho uno de cada por entreno.
ALTER TABLE public.call_up_players
  ADD COLUMN remind_wellness_at timestamptz,
  ADD COLUMN remind_rpe_at timestamptz;
