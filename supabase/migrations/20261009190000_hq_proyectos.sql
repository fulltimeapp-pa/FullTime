-- FullTime HQ: proyectos del negocio (agrupan tareas). Solo la dueña de la plataforma los ve.
CREATE TABLE public.hq_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,                  -- "Primeros 5 clubes"
  goal text,                           -- meta: "5 clubes pagando"
  due_date date,                       -- fecha límite (opcional)
  status text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'pausa', 'terminado')),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TRIGGER hq_projects_set_updated_at BEFORE UPDATE ON public.hq_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.hq_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo la duena gestiona proyectos" ON public.hq_projects
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Cada tarea puede pertenecer a un proyecto. Si se borra el proyecto, la tarea queda suelta.
ALTER TABLE public.hq_tasks ADD COLUMN project_id uuid REFERENCES public.hq_projects(id) ON DELETE SET NULL;
CREATE INDEX hq_tasks_project_idx ON public.hq_tasks (project_id);
