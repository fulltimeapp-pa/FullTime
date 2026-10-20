-- Estado de la jugadora además de "lesionada" (decidido con Bárbara el 20-oct, idea tomada de goTeam):
--   · duda: molestia, enferma, viaje… puede que no esté.
--   · sancionada: por roja o acumulación de amarillas (con los partidos de sanción, si se saben).
-- Igual que las lesiones (la "duda" puede ser de salud y muchas son menores):
--   · Lo ve y lo anota SOLO el cuerpo técnico de la categoría de la jugadora.
--   · Cada jugadora ve únicamente lo suyo (y no lo puede crear ni cambiar).
--   · Sus compañeras y los entrenadores de otras categorías no ven nada.
-- Sigue activo mientras no se quite (cleared_on) y no haya pasado la fecha "hasta" (si tiene).
CREATE TABLE public.player_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('duda', 'sancionada')),
  note text CHECK (note IS NULL OR length(note) <= 200),
  matches smallint CHECK (matches IS NULL OR matches BETWEEN 1 AND 30),  -- partidos de sanción
  since date NOT NULL,
  until date,               -- hasta cuándo (opcional): pasada la fecha deja de contar sola
  cleared_on date,          -- cuándo se quitó a mano ("ya está disponible")
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_statuses_until_after CHECK (until IS NULL OR until >= since),
  CONSTRAINT player_statuses_cleared_after CHECK (cleared_on IS NULL OR cleared_on >= since),
  CONSTRAINT player_statuses_matches_only_sanction CHECK (matches IS NULL OR status = 'sancionada')
);
CREATE INDEX player_statuses_player_idx ON public.player_statuses (player_id, since DESC);
CREATE INDEX player_statuses_open_idx ON public.player_statuses (club_id) WHERE cleared_on IS NULL;

CREATE TRIGGER player_statuses_set_updated_at BEFORE UPDATE ON public.player_statuses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- El club sale de la jugadora, y un estado no se puede pasar a otra jugadora.
CREATE OR REPLACE FUNCTION public.player_statuses_fill_club()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.player_id <> OLD.player_id THEN
    RAISE EXCEPTION 'No se puede pasar un estado a otra jugadora.';
  END IF;
  SELECT club_id INTO NEW.club_id FROM public.players WHERE id = NEW.player_id;
  IF NEW.club_id IS NULL THEN RAISE EXCEPTION 'No encontramos a esa jugadora.'; END IF;
  RETURN NEW;
END $function$;
CREATE TRIGGER player_statuses_fill_club BEFORE INSERT OR UPDATE ON public.player_statuses
  FOR EACH ROW EXECUTE FUNCTION public.player_statuses_fill_club();

ALTER TABLE public.player_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff de la categoria gestiona estados" ON public.player_statuses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_statuses.player_id AND public.is_category_staff(auth.uid(), p.club_id, p.category_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_statuses.player_id AND public.is_category_staff(auth.uid(), p.club_id, p.category_id)));
CREATE POLICY "Jugadora ve su estado" ON public.player_statuses FOR SELECT TO authenticated
  USING (public.is_player_self(player_id));
