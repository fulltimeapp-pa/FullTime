-- FullTime HQ: asistente por Telegram, etapa 1 (decidido con Bárbara el 8-nov-2026).
-- Cada mañana a las 7:00 le manda a Bárbara un resumen del HQ, y 1 hora antes de cada llamada un
-- aviso. Lo arma el reloj de recordatorios que ya corre cada 15 minutos (no hay reloj nuevo).
--   hq_tasks.due_time: hora opcional de la tarea (para las llamadas y reuniones).
--   hq_assistant_log:  qué ya se mandó, para no repetir el resumen ni los avisos.
-- Solo la dueña de la plataforma lo ve. Lo escribe solo el servidor (que no pasa por RLS).
-- No guarda ni manda datos de jugadoras.

ALTER TABLE public.hq_tasks ADD COLUMN due_time time;

CREATE TABLE public.hq_assistant_log (
  kind text NOT NULL CHECK (kind IN ('resumen', 'aviso')),
  ref text NOT NULL,                    -- resumen: la fecha · aviso: tarea + fecha + hora
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, ref)
);

ALTER TABLE public.hq_assistant_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo la duena ve lo que mando el asistente" ON public.hq_assistant_log
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());
