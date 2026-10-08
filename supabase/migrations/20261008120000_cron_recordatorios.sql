-- Tarea 8: cada 15 minutos Supabase llama a la app para mandar los recordatorios.
-- La clave (CRON_SECRET, la misma que está en Vercel) NO va aquí: se guarda aparte en
-- Supabase Vault con el nombre 'cron_secret' y la tarea la lee al correr.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Si ya existía (por ejemplo al reaplicar), se reemplaza.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'fulltime-recordatorios';

SELECT cron.schedule(
  'fulltime-recordatorios',
  '*/15 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://fulltimeapp.vercel.app/api/public/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $job$
);
