-- FullTime HQ: orden manual de las tareas dentro de un proyecto (flechas ↑ ↓).
ALTER TABLE public.hq_tasks ADD COLUMN position integer;

-- Las tareas que ya están en un proyecto arrancan en el orden de hoy: por fecha y luego por creación.
UPDATE public.hq_tasks t
SET position = o.n
FROM (
  SELECT id, (row_number() OVER (PARTITION BY project_id ORDER BY due_date NULLS LAST, created_at) - 1)::int AS n
  FROM public.hq_tasks
  WHERE project_id IS NOT NULL
) o
WHERE t.id = o.id;
