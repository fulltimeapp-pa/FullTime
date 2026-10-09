-- FullTime HQ: cotizaciones para clubes. Solo la dueña de la plataforma las ve.
-- El total se guarda tal cual se cotizó, para que no cambie si después cambian los precios.
CREATE TABLE public.hq_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer GENERATED ALWAYS AS IDENTITY,      -- COT-0001
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  client_name text NOT NULL,                       -- a quién va dirigida
  team text,                                       -- club o equipo
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  plan text NOT NULL CHECK (plan IN ('equipo', 'academia')),
  teams integer NOT NULL DEFAULT 1 CHECK (teams BETWEEN 1 AND 50),
  months integer NOT NULL CHECK (months IN (1, 3, 6, 12)),
  extra_discount numeric(5,2) NOT NULL DEFAULT 0 CHECK (extra_discount BETWEEN 0 AND 100),
  total numeric(10,2) NOT NULL CHECK (total >= 0),
  status text NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'enviada', 'aceptada', 'rechazada')),
  valid_until date NOT NULL DEFAULT (current_date + 15),
  notes text,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX hq_quotes_prospect_idx ON public.hq_quotes (prospect_id);

CREATE TRIGGER hq_quotes_set_updated_at BEFORE UPDATE ON public.hq_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.hq_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo la duena gestiona cotizaciones" ON public.hq_quotes
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
