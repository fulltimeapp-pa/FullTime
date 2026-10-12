-- Lesiones de las jugadoras (decidido con Bárbara el 12-oct, a pedido de Carlos Rivera).
-- Son datos de salud de menores, así que:
--   · Las ve y las anota SOLO el cuerpo técnico de la categoría de la jugadora.
--   · Cada jugadora ve únicamente las suyas (y no las puede crear ni cambiar).
--   · Sus compañeras y los entrenadores de otras categorías no ven nada.
-- Cada lesión guarda el punto marcado en la figura (frente o espalda), la zona, el tipo, la fecha de
-- baja, la previsión de alta y la fecha real de alta. Sin alta = sigue lesionada.
CREATE TABLE public.player_injuries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  body_side text NOT NULL CHECK (body_side IN ('frente', 'espalda')),
  pos_x numeric(5,2) NOT NULL CHECK (pos_x BETWEEN 0 AND 100),  -- % del ancho de la figura
  pos_y numeric(5,2) NOT NULL CHECK (pos_y BETWEEN 0 AND 100),  -- % del alto de la figura
  zone text NOT NULL CHECK (zone IN (
    'cabeza', 'cuello', 'hombro', 'brazo', 'codo', 'antebrazo', 'mano', 'pecho', 'abdomen',
    'espalda_alta', 'espalda_baja', 'cadera_ingle', 'gluteo', 'muslo_anterior', 'muslo_posterior',
    'aductor', 'rodilla', 'pantorrilla', 'espinilla', 'tobillo', 'pie'
  )),
  laterality text NOT NULL DEFAULT 'centro' CHECK (laterality IN ('derecha', 'izquierda', 'centro')),
  injury_type text NOT NULL CHECK (injury_type IN (
    'esguince', 'contractura', 'desgarro', 'sobrecarga', 'golpe', 'tendinitis', 'fractura', 'luxacion', 'conmocion', 'otra'
  )),
  description text CHECK (description IS NULL OR length(description) <= 300),
  injured_on date NOT NULL,          -- fecha de baja
  expected_return date,              -- previsión de alta
  returned_on date,                  -- alta real (vacío = sigue lesionada)
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_injuries_expected_after CHECK (expected_return IS NULL OR expected_return >= injured_on),
  CONSTRAINT player_injuries_returned_after CHECK (returned_on IS NULL OR returned_on >= injured_on)
);
CREATE INDEX player_injuries_player_idx ON public.player_injuries (player_id, injured_on DESC);
CREATE INDEX player_injuries_active_idx ON public.player_injuries (club_id) WHERE returned_on IS NULL;

CREATE TRIGGER player_injuries_set_updated_at BEFORE UPDATE ON public.player_injuries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- El club sale de la jugadora, y una lesión no se puede pasar a otra jugadora.
CREATE OR REPLACE FUNCTION public.player_injuries_fill_club()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.player_id <> OLD.player_id THEN
    RAISE EXCEPTION 'No se puede pasar una lesión a otra jugadora.';
  END IF;
  SELECT club_id INTO NEW.club_id FROM public.players WHERE id = NEW.player_id;
  IF NEW.club_id IS NULL THEN RAISE EXCEPTION 'No encontramos a esa jugadora.'; END IF;
  RETURN NEW;
END $function$;
CREATE TRIGGER player_injuries_fill_club BEFORE INSERT OR UPDATE ON public.player_injuries
  FOR EACH ROW EXECUTE FUNCTION public.player_injuries_fill_club();

ALTER TABLE public.player_injuries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff de la categoria gestiona lesiones" ON public.player_injuries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_injuries.player_id AND public.is_category_staff(auth.uid(), p.club_id, p.category_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_injuries.player_id AND public.is_category_staff(auth.uid(), p.club_id, p.category_id)));
CREATE POLICY "Jugadora ve sus lesiones" ON public.player_injuries FOR SELECT TO authenticated
  USING (public.is_player_self(player_id));
