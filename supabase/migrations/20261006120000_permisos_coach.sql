-- Tarea 4: el rol "coach" (cuerpo técnico) puede hacer todo el trabajo del día
-- a día: plantel, categorías, convocatorias, entrenos y plantillas.
-- Queda solo para owner/admin: datos y escudo del club, invitar o quitar
-- cuerpo técnico (staff_invites, club_members, clubs y club-logos no se tocan).
-- Se cambia is_club_admin por is_club_staff en las políticas afectadas.

-- ---- call_ups
DROP POLICY IF EXISTS "Admins can create call-ups" ON public.call_ups;
DROP POLICY IF EXISTS "Admins can delete call-ups" ON public.call_ups;
DROP POLICY IF EXISTS "Admins can update call-ups" ON public.call_ups;
DROP POLICY IF EXISTS "Club staff can update call_ups" ON public.call_ups;
CREATE POLICY "Staff can create call-ups" ON public.call_ups FOR INSERT TO authenticated
  WITH CHECK (public.is_club_staff(auth.uid(), club_id) AND created_by = auth.uid());
CREATE POLICY "Staff can update call-ups" ON public.call_ups FOR UPDATE TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id))
  WITH CHECK (public.is_club_staff(auth.uid(), club_id));
CREATE POLICY "Staff can delete call-ups" ON public.call_ups FOR DELETE TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id));

-- ---- call_up_players
DROP POLICY IF EXISTS "Admins add players to call-ups" ON public.call_up_players;
DROP POLICY IF EXISTS "Admins delete call-up players" ON public.call_up_players;
DROP POLICY IF EXISTS "Update call-up players" ON public.call_up_players;
DROP POLICY IF EXISTS "Staff mark attendance" ON public.call_up_players;
CREATE POLICY "Staff add players to call-ups" ON public.call_up_players FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_club_staff(auth.uid(), c.club_id)));
CREATE POLICY "Staff delete call-up players" ON public.call_up_players FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_club_staff(auth.uid(), c.club_id)));
-- La jugadora sigue pudiendo actualizar su propia fila (responder); el trigger
-- call_up_players_restrict_self_update le impide marcar asistencia.
CREATE POLICY "Staff or own player update call-up players" ON public.call_up_players FOR UPDATE TO authenticated
  USING ((EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_club_staff(auth.uid(), c.club_id))) OR public.is_player_self(player_id))
  WITH CHECK ((EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_club_staff(auth.uid(), c.club_id))) OR public.is_player_self(player_id));

-- ---- players
DROP POLICY IF EXISTS "Admins insert players" ON public.players;
DROP POLICY IF EXISTS "Admins update players" ON public.players;
DROP POLICY IF EXISTS "Admins delete players" ON public.players;
CREATE POLICY "Staff insert players" ON public.players FOR INSERT TO authenticated
  WITH CHECK (public.is_club_staff(auth.uid(), club_id));
CREATE POLICY "Staff update players" ON public.players FOR UPDATE TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id))
  WITH CHECK (public.is_club_staff(auth.uid(), club_id));
CREATE POLICY "Staff delete players" ON public.players FOR DELETE TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id));

-- El trigger dejaba editar fichas completas solo a owner/admin.
CREATE OR REPLACE FUNCTION public.players_restrict_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_club_staff(auth.uid(), OLD.club_id) OR public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id IS NULL
     AND NEW.user_id = auth.uid()
     AND NEW.club_id       IS NOT DISTINCT FROM OLD.club_id
     AND NEW.category_id   IS NOT DISTINCT FROM OLD.category_id
     AND NEW.email         IS NOT DISTINCT FROM OLD.email
     AND NEW.full_name     IS NOT DISTINCT FROM OLD.full_name
     AND NEW.phone         IS NOT DISTINCT FROM OLD.phone
     AND NEW.position      IS NOT DISTINCT FROM OLD.position
     AND NEW.jersey_number IS NOT DISTINCT FROM OLD.jersey_number
     AND NEW.birth_date    IS NOT DISTINCT FROM OLD.birth_date
     AND NEW.invite_token  IS NOT DISTINCT FROM OLD.invite_token
     AND NEW.invited_at    IS NOT DISTINCT FROM OLD.invited_at
  THEN
    RETURN NEW;
  END IF;

  IF NEW.club_id       IS DISTINCT FROM OLD.club_id
  OR NEW.category_id   IS DISTINCT FROM OLD.category_id
  OR NEW.user_id       IS DISTINCT FROM OLD.user_id
  OR NEW.email         IS DISTINCT FROM OLD.email
  OR NEW.full_name     IS DISTINCT FROM OLD.full_name
  OR NEW.phone         IS DISTINCT FROM OLD.phone
  OR NEW.position      IS DISTINCT FROM OLD.position
  OR NEW.jersey_number IS DISTINCT FROM OLD.jersey_number
  OR NEW.birth_date    IS DISTINCT FROM OLD.birth_date
  OR NEW.invite_token  IS DISTINCT FROM OLD.invite_token
  OR NEW.invited_at    IS DISTINCT FROM OLD.invited_at
  THEN
    RAISE EXCEPTION 'Solo puedes actualizar tu foto.';
  END IF;

  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.players_restrict_self_update() FROM PUBLIC, anon, authenticated;

-- ---- categories
DROP POLICY IF EXISTS "Admins insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins delete categories" ON public.categories;
CREATE POLICY "Staff insert categories" ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.is_club_staff(auth.uid(), club_id));
CREATE POLICY "Staff update categories" ON public.categories FOR UPDATE TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id))
  WITH CHECK (public.is_club_staff(auth.uid(), club_id));
CREATE POLICY "Staff delete categories" ON public.categories FOR DELETE TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id));

-- ---- training_activities
DROP POLICY IF EXISTS "admins insert training activities" ON public.training_activities;
DROP POLICY IF EXISTS "admins update training activities" ON public.training_activities;
DROP POLICY IF EXISTS "admins delete training activities" ON public.training_activities;
CREATE POLICY "staff insert training activities" ON public.training_activities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = training_activities.call_up_id AND public.is_club_staff(auth.uid(), c.club_id)));
CREATE POLICY "staff update training activities" ON public.training_activities FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = training_activities.call_up_id AND public.is_club_staff(auth.uid(), c.club_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = training_activities.call_up_id AND public.is_club_staff(auth.uid(), c.club_id)));
CREATE POLICY "staff delete training activities" ON public.training_activities FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = training_activities.call_up_id AND public.is_club_staff(auth.uid(), c.club_id)));

-- ---- session_templates / session_template_activities
DROP POLICY IF EXISTS "admins insert templates" ON public.session_templates;
DROP POLICY IF EXISTS "admins update templates" ON public.session_templates;
DROP POLICY IF EXISTS "admins delete templates" ON public.session_templates;
CREATE POLICY "staff insert templates" ON public.session_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_club_staff(auth.uid(), club_id));
CREATE POLICY "staff update templates" ON public.session_templates FOR UPDATE TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id))
  WITH CHECK (public.is_club_staff(auth.uid(), club_id));
CREATE POLICY "staff delete templates" ON public.session_templates FOR DELETE TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id));

DROP POLICY IF EXISTS "admins insert template activities" ON public.session_template_activities;
DROP POLICY IF EXISTS "admins update template activities" ON public.session_template_activities;
DROP POLICY IF EXISTS "admins delete template activities" ON public.session_template_activities;
CREATE POLICY "staff insert template activities" ON public.session_template_activities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.session_templates t WHERE t.id = session_template_activities.template_id AND public.is_club_staff(auth.uid(), t.club_id)));
CREATE POLICY "staff update template activities" ON public.session_template_activities FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.session_templates t WHERE t.id = session_template_activities.template_id AND public.is_club_staff(auth.uid(), t.club_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.session_templates t WHERE t.id = session_template_activities.template_id AND public.is_club_staff(auth.uid(), t.club_id)));
CREATE POLICY "staff delete template activities" ON public.session_template_activities FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.session_templates t WHERE t.id = session_template_activities.template_id AND public.is_club_staff(auth.uid(), t.club_id)));

-- ---- Fotos de jugadoras (storage)
DROP POLICY IF EXISTS "player_photos_insert_admins" ON storage.objects;
DROP POLICY IF EXISTS "player_photos_update_admins" ON storage.objects;
DROP POLICY IF EXISTS "player_photos_delete_admins" ON storage.objects;
CREATE POLICY "player_photos_insert_staff" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'player-photos' AND public.is_club_staff(auth.uid(), (split_part(name, '/', 1))::uuid));
CREATE POLICY "player_photos_update_staff" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'player-photos' AND public.is_club_staff(auth.uid(), (split_part(name, '/', 1))::uuid))
  WITH CHECK (bucket_id = 'player-photos' AND public.is_club_staff(auth.uid(), (split_part(name, '/', 1))::uuid));
CREATE POLICY "player_photos_delete_staff" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'player-photos' AND public.is_club_staff(auth.uid(), (split_part(name, '/', 1))::uuid));
