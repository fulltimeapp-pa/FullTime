-- FullTime HQ, fase 1: prospectos del CRM (personas o equipos con los que Bárbara está
-- hablando, antes o después de que se registren). Solo la dueña de la plataforma los ve.
CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,                -- persona de contacto
  team text,                         -- equipo / club / academia
  phone text,
  email text,
  stage text NOT NULL DEFAULT 'contacto'
    CONSTRAINT prospects_stage_check CHECK (stage IN
      ('contacto', 'demo_agendada', 'demo_hecha', 'en_prueba', 'pagando', 'perdido')),
  next_step text,                    -- "Mandarle la guía"
  next_date date,                    -- cuándo hacerlo
  notes text,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,  -- su club, cuando se registra
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX prospects_stage_idx ON public.prospects (stage, next_date);

CREATE TRIGGER prospects_set_updated_at BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo la duena gestiona prospectos" ON public.prospects
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
