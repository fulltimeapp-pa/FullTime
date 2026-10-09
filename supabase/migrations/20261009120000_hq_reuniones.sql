-- FullTime HQ: reuniones (notas de cada reunión de ventas o de seguimiento).
-- Solo la dueña de la plataforma las ve. Se pueden ligar a un prospecto del CRM.
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,                 -- "Demo con Carlos"
  meeting_date date NOT NULL DEFAULT current_date,
  attendees text,                      -- con quién
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  summary text,                        -- qué pasó
  liked text,                          -- qué le gustó
  concerns text,                       -- qué preguntó o le preocupó
  next_steps text,                     -- próximos pasos acordados
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX meetings_date_idx ON public.meetings (meeting_date DESC);
CREATE INDEX meetings_prospect_idx ON public.meetings (prospect_id);

CREATE TRIGGER meetings_set_updated_at BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo la duena gestiona reuniones" ON public.meetings
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
