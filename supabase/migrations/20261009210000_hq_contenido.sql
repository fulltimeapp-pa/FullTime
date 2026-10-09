-- FullTime HQ: calendario de contenido para redes sociales. Solo la dueña de la plataforma lo ve.
CREATE TABLE public.hq_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,                 -- la idea: "Cómo saber quién viene al partido"
  network text NOT NULL DEFAULT 'instagram' CHECK (network IN ('instagram', 'tiktok', 'facebook', 'linkedin')),
  format text NOT NULL DEFAULT 'post' CHECK (format IN ('post', 'carrusel', 'reel', 'story')),
  status text NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'borrador', 'programada', 'publicada')),
  publish_date date,                   -- cuándo sale
  caption text,                        -- el texto (copy)
  notes text,                          -- ej. nombre del archivo en la carpeta
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX hq_posts_date_idx ON public.hq_posts (publish_date);

CREATE TRIGGER hq_posts_set_updated_at BEFORE UPDATE ON public.hq_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.hq_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo la duena gestiona contenido" ON public.hq_posts
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
