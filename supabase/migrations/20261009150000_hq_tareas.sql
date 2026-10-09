-- FullTime HQ: tareas del negocio (pendientes con fecha, opcionalmente ligadas a un prospecto).
-- Solo la dueña de la plataforma las ve.
CREATE TABLE public.hq_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  due_date date,                       -- para cuándo (opcional)
  urgent boolean NOT NULL DEFAULT false,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  done_at timestamptz,                 -- cuándo se marcó como hecha (null = pendiente)
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX hq_tasks_pending_idx ON public.hq_tasks (due_date) WHERE done_at IS NULL;

CREATE TRIGGER hq_tasks_set_updated_at BEFORE UPDATE ON public.hq_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.hq_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo la duena gestiona tareas" ON public.hq_tasks
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
