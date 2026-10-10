-- Lista de competiciones de cada club (pedido de Bárbara, 9-oct): agregar, renombrar y borrar.
-- Borrar solo la saca de la lista; los partidos viejos mantienen el nombre que tenían.
-- Renombrar también corrige los partidos del club que usaban el nombre viejo.
CREATE TABLE public.club_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX club_competitions_name_idx ON public.club_competitions (club_id, lower(btrim(name)));

ALTER TABLE public.club_competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff gestiona competiciones" ON public.club_competitions FOR ALL TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id))
  WITH CHECK (public.is_club_staff(auth.uid(), club_id));

-- Al renombrar, los partidos de ese club con el nombre viejo pasan al nuevo.
CREATE OR REPLACE FUNCTION public.club_competitions_rename()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.club_id <> OLD.club_id THEN RAISE EXCEPTION 'No se puede mover una competición a otro club.'; END IF;
  NEW.name := btrim(NEW.name);
  IF lower(NEW.name) <> lower(btrim(OLD.name)) OR NEW.name <> OLD.name THEN
    UPDATE public.match_reports
    SET competition = NEW.name
    WHERE club_id = OLD.club_id AND lower(btrim(competition)) = lower(btrim(OLD.name));
  END IF;
  RETURN NEW;
END $function$;
CREATE TRIGGER club_competitions_on_rename BEFORE UPDATE ON public.club_competitions
  FOR EACH ROW EXECUTE FUNCTION public.club_competitions_rename();

-- Arranca con las que ya se usaron en las hojas.
INSERT INTO public.club_competitions (club_id, name)
SELECT DISTINCT ON (club_id, lower(btrim(competition))) club_id, btrim(competition)
FROM public.match_reports
WHERE competition IS NOT NULL AND btrim(competition) <> ''
ON CONFLICT DO NOTHING;
