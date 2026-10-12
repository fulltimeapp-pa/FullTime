-- Accesos por categoría (decidido con Bárbara el 12-oct, a pedido de Carlos Rivera).
-- Un entrenador (rol coach) con categorías asignadas ve y maneja SOLO esas categorías: jugadoras,
-- convocatorias, entrenos, hojas de partido y respuestas de wellness/RPE.
-- Decisiones:
--   · Un entrenador SIN categorías asignadas sigue viendo todo el club (nada cambia para los clubes
--     de un solo equipo ni para los entrenadores que ya existen).
--   · Solo el dueño o admin del club asigna categorías, y solo ellos crean, renombran o borran
--     categorías (antes cualquier entrenador podía).
--   · Dueño y admin siempre ven todo. Las jugadoras ven lo mismo que antes.

-- Todo o nada: si algo falla, no se aplica ningún cambio.
BEGIN;

-- 1) Qué categorías lleva cada entrenador.
CREATE TABLE public.coach_categories (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  -- RESTRICT: no se puede borrar una categoría que un entrenador tiene asignada. Si se borrara en
  -- cascada, el entrenador podría quedarse sin asignaciones y pasar a ver todo el club.
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, category_id)
);
CREATE INDEX coach_categories_club_idx ON public.coach_categories (club_id, user_id);

-- La categoría tiene que ser del club y la persona tiene que ser entrenador de ese club.
CREATE OR REPLACE FUNCTION public.coach_categories_check()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.id = NEW.category_id AND c.club_id = NEW.club_id) THEN
    RAISE EXCEPTION 'Esa categoría no es de este club.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.club_members m
    WHERE m.user_id = NEW.user_id AND m.club_id = NEW.club_id AND m.role = 'coach'::public.club_role
  ) THEN
    RAISE EXCEPTION 'Solo se asignan categorías a entrenadores del club.';
  END IF;
  RETURN NEW;
END $function$;
CREATE TRIGGER coach_categories_check BEFORE INSERT OR UPDATE ON public.coach_categories
  FOR EACH ROW EXECUTE FUNCTION public.coach_categories_check();

ALTER TABLE public.coach_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin asigna categorias" ON public.coach_categories FOR ALL TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Entrenador ve sus categorias" ON public.coach_categories FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2) ¿Esta persona es cuerpo técnico de ESTA categoría?
CREATE OR REPLACE FUNCTION public.is_category_staff(_user_id uuid, _club_id uuid, _category_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members m
    WHERE m.user_id = _user_id AND m.club_id = _club_id
      AND (
        m.role IN ('owner'::public.club_role, 'admin'::public.club_role)
        OR (
          m.role = 'coach'::public.club_role
          AND (
            NOT EXISTS (SELECT 1 FROM public.coach_categories cc WHERE cc.user_id = _user_id AND cc.club_id = _club_id)
            OR EXISTS (SELECT 1 FROM public.coach_categories cc WHERE cc.user_id = _user_id AND cc.category_id = _category_id)
          )
        )
      )
  );
$function$;
REVOKE ALL ON FUNCTION public.is_category_staff(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_category_staff(uuid, uuid, uuid) TO authenticated, service_role;

-- 3) Jugadoras
DROP POLICY "Staff view club players, player views own row" ON public.players;
DROP POLICY "Staff insert players" ON public.players;
DROP POLICY "Staff update players" ON public.players;
DROP POLICY "Staff delete players" ON public.players;
CREATE POLICY "Staff de la categoria ve jugadoras, jugadora ve la suya" ON public.players FOR SELECT TO authenticated
  USING (public.is_category_staff(auth.uid(), club_id, category_id) OR (user_id IS NOT NULL AND user_id = auth.uid()));
CREATE POLICY "Staff de la categoria agrega jugadoras" ON public.players FOR INSERT TO authenticated
  WITH CHECK (public.is_category_staff(auth.uid(), club_id, category_id));
CREATE POLICY "Staff de la categoria edita jugadoras" ON public.players FOR UPDATE TO authenticated
  USING (public.is_category_staff(auth.uid(), club_id, category_id))
  WITH CHECK (public.is_category_staff(auth.uid(), club_id, category_id));
CREATE POLICY "Staff de la categoria borra jugadoras" ON public.players FOR DELETE TO authenticated
  USING (public.is_category_staff(auth.uid(), club_id, category_id));

-- 4) Convocatorias (las jugadoras siguen viendo las del club, como antes)
DROP POLICY "Members can view club call-ups" ON public.call_ups;
DROP POLICY "Staff can create call-ups" ON public.call_ups;
DROP POLICY "Staff can update call-ups" ON public.call_ups;
DROP POLICY "Staff can delete call-ups" ON public.call_ups;
CREATE POLICY "Staff de la categoria y jugadoras ven convocatorias" ON public.call_ups FOR SELECT TO authenticated
  USING (
    public.is_category_staff(auth.uid(), club_id, category_id)
    OR (public.is_club_member(auth.uid(), club_id) AND NOT public.is_club_staff(auth.uid(), club_id))
  );
CREATE POLICY "Staff de la categoria crea convocatorias" ON public.call_ups FOR INSERT TO authenticated
  WITH CHECK (public.is_category_staff(auth.uid(), club_id, category_id) AND created_by = auth.uid());
CREATE POLICY "Staff de la categoria edita convocatorias" ON public.call_ups FOR UPDATE TO authenticated
  USING (public.is_category_staff(auth.uid(), club_id, category_id))
  WITH CHECK (public.is_category_staff(auth.uid(), club_id, category_id));
CREATE POLICY "Staff de la categoria borra convocatorias" ON public.call_ups FOR DELETE TO authenticated
  USING (public.is_category_staff(auth.uid(), club_id, category_id));

-- 5) Convocadas y sus respuestas
DROP POLICY "Staff view call-up players, player views own row" ON public.call_up_players;
DROP POLICY "Staff add players to call-ups" ON public.call_up_players;
DROP POLICY "Staff or own player update call-up players" ON public.call_up_players;
DROP POLICY "Staff delete call-up players" ON public.call_up_players;
CREATE POLICY "Staff de la categoria ve convocadas, jugadora ve la suya" ON public.call_up_players FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id))
    OR public.is_player_self(player_id)
  );
CREATE POLICY "Staff de la categoria convoca" ON public.call_up_players FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id)));
CREATE POLICY "Staff de la categoria o la propia jugadora actualizan" ON public.call_up_players FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id))
    OR public.is_player_self(player_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id))
    OR public.is_player_self(player_id)
  );
CREATE POLICY "Staff de la categoria quita convocadas" ON public.call_up_players FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id)));

-- 6) Plan del entreno
DROP POLICY "members can read training activities" ON public.training_activities;
DROP POLICY "staff insert training activities" ON public.training_activities;
DROP POLICY "staff update training activities" ON public.training_activities;
DROP POLICY "staff delete training activities" ON public.training_activities;
CREATE POLICY "Staff de la categoria y jugadoras ven el plan" ON public.training_activities FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.call_ups c
    WHERE c.id = training_activities.call_up_id
      AND (public.is_category_staff(auth.uid(), c.club_id, c.category_id)
           OR (public.is_club_member(auth.uid(), c.club_id) AND NOT public.is_club_staff(auth.uid(), c.club_id)))
  ));
CREATE POLICY "Staff de la categoria arma el plan" ON public.training_activities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = training_activities.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id)));
CREATE POLICY "Staff de la categoria edita el plan" ON public.training_activities FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = training_activities.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = training_activities.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id)));
CREATE POLICY "Staff de la categoria borra el plan" ON public.training_activities FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = training_activities.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id)));

-- 7) Hoja de partido (lo de las jugadoras no cambia)
DROP POLICY "Staff gestiona la hoja de partido" ON public.match_reports;
DROP POLICY "Staff gestiona titulares" ON public.match_lineup;
DROP POLICY "Staff gestiona incidencias" ON public.match_events;
CREATE POLICY "Staff de la categoria gestiona la hoja" ON public.match_reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = match_reports.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = match_reports.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id)));
CREATE POLICY "Staff de la categoria gestiona titulares" ON public.match_lineup FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = match_lineup.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = match_lineup.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id)));
CREATE POLICY "Staff de la categoria gestiona incidencias" ON public.match_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = match_events.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = match_events.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id)));

-- 8) Respuestas de wellness y RPE (lo de las jugadoras no cambia)
DROP POLICY "Staff ve respuestas del club" ON public.form_responses;
DROP POLICY "Staff borra respuestas del club" ON public.form_responses;
CREATE POLICY "Staff de la categoria ve respuestas" ON public.form_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = form_responses.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id)));
CREATE POLICY "Staff de la categoria borra respuestas" ON public.form_responses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = form_responses.call_up_id AND public.is_category_staff(auth.uid(), c.club_id, c.category_id)));

-- 9) Categorías: las crea, renombra y borra solo el dueño o admin. El entrenador con categorías
--    asignadas ve solo las suyas; las jugadoras, como antes.
DROP POLICY "Club members can view categories" ON public.categories;
DROP POLICY "Staff insert categories" ON public.categories;
DROP POLICY "Staff update categories" ON public.categories;
DROP POLICY "Staff delete categories" ON public.categories;
CREATE POLICY "Staff de la categoria y jugadoras ven categorias" ON public.categories FOR SELECT TO authenticated
  USING (
    public.is_category_staff(auth.uid(), club_id, id)
    OR (public.is_club_member(auth.uid(), club_id) AND NOT public.is_club_staff(auth.uid(), club_id))
  );
CREATE POLICY "Admin crea categorias" ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admin edita categorias" ON public.categories FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admin borra categorias" ON public.categories FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

-- 10) Asistencia: el informe cuenta solo las categorías que la persona puede ver.
CREATE OR REPLACE FUNCTION public.club_attendance_stats(_club_id uuid, _category_id uuid DEFAULT NULL::uuid, _since date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_eventos int := 0; v_pct int; v_jug jsonb;
BEGIN
  IF NOT public.is_club_staff(auth.uid(), _club_id) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT count(*)::int INTO v_eventos
  FROM public.call_ups cu
  WHERE cu.club_id=_club_id AND cu.starts_at < now()
    AND public.is_category_staff(auth.uid(), cu.club_id, cu.category_id)
    AND (_category_id IS NULL OR cu.category_id=_category_id)
    AND (_since IS NULL OR cu.starts_at >= _since::timestamptz);

  WITH ev AS (
    SELECT cu.id FROM public.call_ups cu
    WHERE cu.club_id=_club_id AND cu.starts_at < now()
      AND public.is_category_staff(auth.uid(), cu.club_id, cu.category_id)
      AND (_category_id IS NULL OR cu.category_id=_category_id)
      AND (_since IS NULL OR cu.starts_at >= _since::timestamptz)
  ),
  agg AS (
    SELECT p.id AS player_id, p.full_name, cat.name AS category_name,
      count(*)::int AS convocada,
      count(*) FILTER (WHERE cup.attended IS TRUE)::int AS asistio,
      count(*) FILTER (WHERE cup.attended IS FALSE)::int AS falto,
      count(*) FILTER (WHERE cup.attended IS NULL)::int AS sin_marcar
    FROM public.call_up_players cup
    JOIN ev ON ev.id=cup.call_up_id
    JOIN public.players p ON p.id=cup.player_id
    LEFT JOIN public.categories cat ON cat.id=p.category_id
    GROUP BY p.id, p.full_name, cat.name
  ),
  perplayer AS (
    SELECT player_id, full_name, category_name, convocada, asistio, falto, sin_marcar,
      round(asistio::numeric / NULLIF(asistio+falto,0) * 100)::int AS pct
    FROM agg
  )
  SELECT
    round(sum(asistio)::numeric / NULLIF(sum(asistio+falto),0) * 100)::int,
    COALESCE(jsonb_agg(row_to_json(perplayer)::jsonb ORDER BY pct ASC NULLS LAST, full_name), '[]'::jsonb)
  INTO v_pct, v_jug
  FROM perplayer;

  RETURN jsonb_build_object('resumen', jsonb_build_object('eventos_pasados', v_eventos, 'equipo_pct', v_pct), 'jugadoras', v_jug);
END;
$function$;

-- 11) Seguro: si quedó alguna regla vieja que deje ver todo el club al cuerpo técnico, se cancela todo.
DO $check$
DECLARE
  _mal text;
BEGIN
  SELECT string_agg(format('%s: "%s"', tablename, policyname), '; ') INTO _mal
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('players', 'call_ups', 'call_up_players', 'training_activities', 'match_reports', 'match_lineup', 'match_events', 'form_responses', 'categories')
    AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ '(is_club_staff|is_club_member|club_members)'
    AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) !~ 'is_category_staff';
  IF _mal IS NOT NULL THEN
    RAISE EXCEPTION 'Quedaron reglas viejas sin limitar por categoría: %', _mal;
  END IF;
END
$check$;

COMMIT;
