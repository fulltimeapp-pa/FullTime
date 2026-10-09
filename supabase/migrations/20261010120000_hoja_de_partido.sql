-- Hoja de partido (decidido con Bárbara, 9-oct, a partir de la demo con Carlos Rivera y la revisión
-- de goTeam). Tres tablas nuevas; no se toca ninguna tabla existente.
--   match_reports: datos del partido (rival, tipo, duración, notas). Una por convocatoria de partido.
--   match_lineup:  titular o suplente de cada convocada.
--   match_events:  goles, autogol del rival, gol en contra, tarjetas, cambios y lesiones, con minuto.
-- Quién ve qué: el cuerpo técnico ve y edita todo. Cada jugadora ve solo lo suyo (su titularidad,
-- sus goles, tarjetas, cambios y su lesión) y los datos generales de los partidos donde fue convocada.
-- El resultado y los minutos jugados se calculan en la app a partir de estas filas.

CREATE TABLE public.match_reports (
  call_up_id uuid PRIMARY KEY REFERENCES public.call_ups(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  opponent text,
  match_type text NOT NULL DEFAULT 'liga' CHECK (match_type IN ('liga', 'torneo', 'copa', 'amistoso')),
  duration_min integer NOT NULL DEFAULT 90 CHECK (duration_min BETWEEN 10 AND 150),
  notes text,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.match_lineup (
  call_up_id uuid NOT NULL REFERENCES public.call_ups(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('titular', 'suplente')),
  PRIMARY KEY (call_up_id, player_id)
);

CREATE TABLE public.match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_up_id uuid NOT NULL REFERENCES public.call_ups(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('gol', 'autogol_rival', 'gol_contra', 'amarilla', 'roja', 'cambio', 'lesion')),
  minute integer CHECK (minute IS NULL OR minute BETWEEN 0 AND 150),
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,     -- quien marcó, la amonestada, la que sale o la lesionada
  player_in_id uuid REFERENCES public.players(id) ON DELETE CASCADE,  -- solo en cambios: la que entra
  note text,                                                           -- solo en lesiones: qué le pasó
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Cada tipo con sus jugadoras: el gol en contra y el autogol del rival no se le cargan a nadie.
  CONSTRAINT match_events_players_by_kind CHECK (
    CASE kind
      WHEN 'cambio' THEN player_id IS NOT NULL AND player_in_id IS NOT NULL AND player_id <> player_in_id
      WHEN 'autogol_rival' THEN player_id IS NULL AND player_in_id IS NULL
      WHEN 'gol_contra' THEN player_id IS NULL AND player_in_id IS NULL
      ELSE player_id IS NOT NULL AND player_in_id IS NULL
    END
  ),
  CONSTRAINT match_events_note_only_injury CHECK (note IS NULL OR kind = 'lesion')
);

CREATE INDEX match_events_call_up_idx ON public.match_events (call_up_id, minute);
CREATE INDEX match_events_player_idx ON public.match_events (player_id);
CREATE INDEX match_lineup_player_idx ON public.match_lineup (player_id);

-- El club sale siempre de la convocatoria (no lo manda la app), la convocatoria tiene que ser un
-- partido y las jugadoras tienen que ser de ese club.
CREATE OR REPLACE FUNCTION public.match_rows_fill_club()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _club uuid;
  _kind public.call_up_kind;
  _row jsonb := to_jsonb(NEW);
  _pid uuid;
BEGIN
  SELECT club_id, kind INTO _club, _kind FROM public.call_ups WHERE id = NEW.call_up_id;
  IF _club IS NULL THEN RAISE EXCEPTION 'No encontramos ese partido.'; END IF;
  IF _kind <> 'partido' THEN RAISE EXCEPTION 'La hoja de partido es solo para partidos.'; END IF;
  NEW.club_id := _club;

  -- player_id existe en titulares e incidencias; player_in_id solo en incidencias.
  FOREACH _pid IN ARRAY ARRAY[(_row->>'player_id')::uuid, (_row->>'player_in_id')::uuid] LOOP
    IF _pid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.players p WHERE p.id = _pid AND p.club_id = _club) THEN
      RAISE EXCEPTION 'Esa jugadora no es de este club.';
    END IF;
  END LOOP;
  RETURN NEW;
END $function$;

CREATE TRIGGER match_reports_fill_club BEFORE INSERT OR UPDATE ON public.match_reports
  FOR EACH ROW EXECUTE FUNCTION public.match_rows_fill_club();
CREATE TRIGGER match_lineup_fill_club BEFORE INSERT OR UPDATE ON public.match_lineup
  FOR EACH ROW EXECUTE FUNCTION public.match_rows_fill_club();
CREATE TRIGGER match_events_fill_club BEFORE INSERT OR UPDATE ON public.match_events
  FOR EACH ROW EXECUTE FUNCTION public.match_rows_fill_club();
CREATE TRIGGER match_reports_set_updated_at BEFORE UPDATE ON public.match_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.match_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_lineup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- match_reports: el cuerpo técnico todo; la jugadora lee los datos generales de sus partidos.
CREATE POLICY "Staff gestiona la hoja de partido" ON public.match_reports FOR ALL TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id))
  WITH CHECK (public.is_club_staff(auth.uid(), club_id));
CREATE POLICY "Jugadora ve los datos de sus partidos" ON public.match_reports FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.call_up_players cp
    WHERE cp.call_up_id = match_reports.call_up_id AND public.is_player_self(cp.player_id)
  ));

-- match_lineup: el cuerpo técnico todo; la jugadora solo su fila.
CREATE POLICY "Staff gestiona titulares" ON public.match_lineup FOR ALL TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id))
  WITH CHECK (public.is_club_staff(auth.uid(), club_id));
CREATE POLICY "Jugadora ve si fue titular" ON public.match_lineup FOR SELECT TO authenticated
  USING (public.is_player_self(player_id));

-- match_events: el cuerpo técnico todo; la jugadora solo donde aparece ella.
CREATE POLICY "Staff gestiona incidencias" ON public.match_events FOR ALL TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id))
  WITH CHECK (public.is_club_staff(auth.uid(), club_id));
CREATE POLICY "Jugadora ve sus incidencias" ON public.match_events FOR SELECT TO authenticated
  USING (public.is_player_self(player_id) OR public.is_player_self(player_in_id));
