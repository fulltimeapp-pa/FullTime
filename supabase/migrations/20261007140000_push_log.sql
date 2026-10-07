-- Tarea 7: registro de avisos al celular, para que la dueña vea si fallan.
-- Lo escribe solo el servidor (service role). Lectura: solo dueña de la plataforma.
-- Se ve en Supabase → Table Editor → push_log.
CREATE TABLE public.push_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  call_up_id uuid REFERENCES public.call_ups(id) ON DELETE SET NULL,
  kind text NOT NULL,          -- new | updated | reminder | bulk | auto_night | auto_soon
  targeted integer NOT NULL DEFAULT 0,   -- jugadoras a las que les tocaba
  reachable integer NOT NULL DEFAULT 0,  -- de esas, con avisos activados
  sent integer NOT NULL DEFAULT 0,       -- celulares a los que salió bien
  failed integer NOT NULL DEFAULT 0,     -- celulares a los que falló
  detail text                            -- códigos de falla o el error, si hubo
);
CREATE INDEX push_log_created_idx ON public.push_log (created_at DESC);
ALTER TABLE public.push_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo la duena lee el registro de avisos" ON public.push_log
  FOR SELECT TO authenticated USING (public.is_platform_admin());
