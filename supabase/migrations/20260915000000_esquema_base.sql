-- Esquema base de FullTime.
-- Reconstruido el 2026-09-28 a partir de la base de Lovable Cloud (tal como
-- estaba antes de la migración 20260915144757). Sirve para crear la base desde
-- cero en un Supabase propio. No cambia ninguna regla: los arreglos van en
-- migraciones posteriores.

-- ---------------------------------------------------------------- Tipos

CREATE TYPE public.call_up_kind AS ENUM ('partido', 'entreno');
CREATE TYPE public.call_up_response_status AS ENUM ('pending', 'going', 'declined');
CREATE TYPE public.club_role AS ENUM ('owner', 'admin', 'coach', 'jugadora');
CREATE TYPE public.player_position AS ENUM ('portera', 'defensa', 'mediocampista', 'delantera');

-- ---------------------------------------------------------------- Tablas

CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  logo_path text
);

CREATE TABLE public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.club_role NOT NULL DEFAULT 'coach'::public.club_role,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT club_members_club_id_user_id_key UNIQUE (club_id, user_id),
  CONSTRAINT club_members_user_id_key UNIQUE (user_id)
);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  position public.player_position,
  jersey_number integer,
  phone text,
  birth_date date,
  invited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  photo_path text,
  invite_token text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_expires_at timestamptz,
  CONSTRAINT players_invite_token_key UNIQUE (invite_token)
);

CREATE TABLE public.call_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  kind public.call_up_kind NOT NULL,
  starts_at timestamptz NOT NULL,
  place text NOT NULL,
  note text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  objetivo text,
  wellness_enabled boolean NOT NULL DEFAULT false,
  rpe_enabled boolean NOT NULL DEFAULT false
);

CREATE TABLE public.call_up_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_up_id uuid NOT NULL REFERENCES public.call_ups(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status public.call_up_response_status NOT NULL DEFAULT 'pending'::public.call_up_response_status,
  reason text,
  read_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  wellness_sleep smallint,
  wellness_energy smallint,
  wellness_mood smallint,
  wellness_soreness smallint,
  wellness_at timestamptz,
  rpe smallint,
  rpe_at timestamptz,
  remind_night_before_at timestamptz,
  remind_soon_at timestamptz,
  attended boolean,
  attended_at timestamptz,
  CONSTRAINT call_up_players_call_up_id_player_id_key UNIQUE (call_up_id, player_id),
  CONSTRAINT call_up_players_rpe_range CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
  CONSTRAINT call_up_players_wellness_energy_range CHECK (wellness_energy IS NULL OR (wellness_energy >= 1 AND wellness_energy <= 5)),
  CONSTRAINT call_up_players_wellness_mood_range CHECK (wellness_mood IS NULL OR (wellness_mood >= 1 AND wellness_mood <= 5)),
  CONSTRAINT call_up_players_wellness_sleep_range CHECK (wellness_sleep IS NULL OR (wellness_sleep >= 1 AND wellness_sleep <= 5)),
  CONSTRAINT call_up_players_wellness_soreness_range CHECK (wellness_soreness IS NULL OR (wellness_soreness >= 1 AND wellness_soreness <= 5))
);

CREATE TABLE public.club_crm (
  club_id uuid PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,
  status text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.club_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE,
  months integer NOT NULL,
  amount numeric(10,2),
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  method text DEFAULT 'yappy'::text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.club_subscription (
  club_id uuid PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,
  paid_until date,
  blocked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint)
);

CREATE TABLE public.session_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.session_template_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.session_templates(id) ON DELETE CASCADE,
  part text NOT NULL CONSTRAINT session_template_activities_part_check CHECK (part = ANY (ARRAY['calentamiento'::text, 'principal'::text, 'vuelta'::text])),
  name text NOT NULL,
  duration_min integer,
  intensity text CONSTRAINT session_template_activities_intensity_check CHECK (intensity = ANY (ARRAY['suave'::text, 'media'::text, 'alta'::text])),
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  role public.club_role NOT NULL CONSTRAINT staff_invites_role_check CHECK (role = ANY (ARRAY['admin'::public.club_role, 'coach'::public.club_role])),
  token text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  expires_at timestamptz,
  CONSTRAINT staff_invites_token_key UNIQUE (token)
);

CREATE TABLE public.training_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_up_id uuid NOT NULL REFERENCES public.call_ups(id) ON DELETE CASCADE,
  part text NOT NULL CONSTRAINT training_activities_part_check CHECK (part = ANY (ARRAY['calentamiento'::text, 'principal'::text, 'vuelta'::text])),
  name text NOT NULL,
  duration_min integer,
  intensity text CONSTRAINT training_activities_intensity_check CHECK (intensity = ANY (ARRAY['suave'::text, 'media'::text, 'alta'::text])),
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- Índices

CREATE INDEX categories_club_id_idx ON public.categories USING btree (club_id);
CREATE INDEX idx_call_up_players_attended ON public.call_up_players USING btree (call_up_id, attended);
CREATE INDEX idx_call_up_players_callup ON public.call_up_players USING btree (call_up_id);
CREATE INDEX idx_call_up_players_player ON public.call_up_players USING btree (player_id);
CREATE INDEX idx_call_ups_category ON public.call_ups USING btree (category_id);
CREATE INDEX idx_call_ups_club_starts ON public.call_ups USING btree (club_id, starts_at DESC);
CREATE INDEX idx_club_payments_club ON public.club_payments USING btree (club_id, paid_at DESC);
CREATE INDEX players_category_id_idx ON public.players USING btree (category_id);
CREATE INDEX players_club_id_idx ON public.players USING btree (club_id);
CREATE INDEX players_user_id_idx ON public.players USING btree (user_id);
CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions USING btree (user_id);
CREATE INDEX session_templates_club_idx ON public.session_templates USING btree (club_id, created_at DESC);
CREATE INDEX sta_template_idx ON public.session_template_activities USING btree (template_id, part, sort_order);
CREATE INDEX staff_invites_club_id_idx ON public.staff_invites USING btree (club_id);
CREATE INDEX training_activities_call_up_idx ON public.training_activities USING btree (call_up_id, part, sort_order);

-- ---------------------------------------------------------------- Funciones de apoyo para RLS

CREATE OR REPLACE FUNCTION public.is_club_admin(_user_id uuid, _club_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.club_members
    WHERE user_id = _user_id AND club_id = _club_id
      AND role IN ('owner'::public.club_role, 'admin'::public.club_role)
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_club_member(_user_id uuid, _club_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.club_members WHERE user_id = _user_id AND club_id = _club_id);
$function$;

CREATE OR REPLACE FUNCTION public.is_club_staff(_user_id uuid, _club_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE user_id = _user_id
      AND club_id = _club_id
      AND role IN ('owner'::public.club_role, 'admin'::public.club_role, 'coach'::public.club_role)
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_player_self(_player_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = _player_id AND p.user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.mask_email(_email text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _email IS NULL OR position('@' in _email) = 0 THEN NULL
    ELSE
      CASE WHEN length(split_part(_email, '@', 1)) <= 2
        THEN left(split_part(_email, '@', 1), 1) || '***'
        ELSE left(split_part(_email, '@', 1), 2) || '***'
      END || '@' || split_part(_email, '@', 2)
  END
$function$;

-- ---------------------------------------------------------------- Funciones de triggers

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.ensure_club_creator_membership()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.club_members (club_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin'::public.club_role)
  ON CONFLICT (club_id, user_id)
  DO UPDATE SET role = 'admin'::public.club_role;

  INSERT INTO public.categories (club_id, name)
  SELECT NEW.id, 'Primer equipo'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories WHERE club_id = NEW.id
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.call_up_players_restrict_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _club uuid;
  _is_staff boolean;
BEGIN
  SELECT club_id INTO _club FROM public.call_ups WHERE id = OLD.call_up_id;
  _is_staff := _club IS NOT NULL AND public.is_club_staff(auth.uid(), _club);

  -- Solo el staff puede reasignar la fila a otro call_up/player.
  IF NEW.call_up_id <> OLD.call_up_id OR NEW.player_id <> OLD.player_id THEN
    IF NOT _is_staff THEN
      RAISE EXCEPTION 'No puedes reasignar esta respuesta.';
    END IF;
    RETURN NEW;
  END IF;

  -- Solo el staff puede marcar asistencia.
  IF NOT _is_staff THEN
    IF NEW.attended IS DISTINCT FROM OLD.attended OR NEW.attended_at IS DISTINCT FROM OLD.attended_at THEN
      RAISE EXCEPTION 'Solo el cuerpo técnico puede marcar la asistencia.';
    END IF;
  END IF;

  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.players_restrict_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_club_admin(auth.uid(), OLD.club_id) OR public.is_platform_admin() THEN
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

-- ---------------------------------------------------------------- Funciones de la app

CREATE OR REPLACE FUNCTION public.accept_player_invite(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _row RECORD;
  _membership RECORD;
  _members_count integer := 0;
  _players_count integer := 0;
  _callups_count integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _token IS NULL OR length(btrim(_token)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  SELECT id AS player_id, club_id, user_id, email AS player_email, invite_expires_at
  INTO _row
  FROM public.players
  WHERE invite_token = _token
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF _row.invite_expires_at IS NOT NULL AND _row.invite_expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF _row.player_email IS NOT NULL AND length(btrim(_row.player_email)) > 0
     AND lower(btrim(coalesce(_email, ''))) <> lower(btrim(_row.player_email)) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'email_mismatch',
      'expected_email_masked', public.mask_email(_row.player_email)
    );
  END IF;

  IF _row.user_id IS NOT NULL AND _row.user_id <> _uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed');
  END IF;

  SELECT cm.club_id, cm.role, c.created_by
  INTO _membership
  FROM public.club_members cm
  JOIN public.clubs c ON c.id = cm.club_id
  WHERE cm.user_id = _uid
  ORDER BY cm.created_at ASC
  LIMIT 1;

  IF FOUND THEN
    IF _membership.club_id = _row.club_id THEN
      IF _membership.role IN ('owner'::public.club_role, 'admin'::public.club_role, 'coach'::public.club_role) THEN
        RETURN jsonb_build_object(
          'ok', false,
          'reason', 'already_member',
          'club_id', _row.club_id,
          'player_id', _row.player_id
        );
      END IF;
    ELSE
      SELECT count(*) INTO _members_count FROM public.club_members WHERE club_id = _membership.club_id;
      SELECT count(*) INTO _players_count FROM public.players WHERE club_id = _membership.club_id;
      SELECT count(*) INTO _callups_count FROM public.call_ups WHERE club_id = _membership.club_id;

      IF _membership.created_by = _uid
        AND _membership.role IN ('owner'::public.club_role, 'admin'::public.club_role, 'coach'::public.club_role)
        AND _members_count = 1
        AND _players_count = 0
        AND _callups_count = 0
      THEN
        DELETE FROM public.clubs WHERE id = _membership.club_id;
      ELSE
        RETURN jsonb_build_object(
          'ok', false,
          'reason', 'already_in_other_club',
          'club_id', _membership.club_id,
          'player_id', _row.player_id
        );
      END IF;
    END IF;
  END IF;

  UPDATE public.players
  SET user_id = _uid
  WHERE id = _row.player_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.club_members WHERE club_id = _row.club_id AND user_id = _uid
  ) THEN
    INSERT INTO public.club_members (club_id, user_id, role)
    VALUES (_row.club_id, _uid, 'jugadora'::public.club_role);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'reason', 'accepted',
    'club_id', _row.club_id,
    'player_id', _row.player_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_staff_invite(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _invite RECORD;
  _membership RECORD;
  _members_count integer := 0;
  _players_count integer := 0;
  _callups_count integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _token IS NULL OR length(btrim(_token)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  SELECT id, club_id, role, accepted_at, email AS invite_email, expires_at
  INTO _invite
  FROM public.staff_invites
  WHERE token = _token
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF _invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
  END IF;

  IF _invite.expires_at IS NOT NULL AND _invite.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF _invite.invite_email IS NOT NULL AND length(btrim(_invite.invite_email)) > 0
     AND lower(btrim(coalesce(_email, ''))) <> lower(btrim(_invite.invite_email)) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'email_mismatch',
      'expected_email_masked', public.mask_email(_invite.invite_email)
    );
  END IF;

  SELECT cm.club_id, cm.role, c.created_by
  INTO _membership
  FROM public.club_members cm
  JOIN public.clubs c ON c.id = cm.club_id
  WHERE cm.user_id = _uid
  ORDER BY cm.created_at ASC
  LIMIT 1;

  IF FOUND THEN
    IF _membership.club_id = _invite.club_id THEN
      UPDATE public.staff_invites
        SET accepted_at = now(), accepted_by = _uid
        WHERE id = _invite.id;
      RETURN jsonb_build_object('ok', true, 'reason', 'already_member', 'club_id', _invite.club_id);
    ELSE
      SELECT count(*) INTO _members_count FROM public.club_members WHERE club_id = _membership.club_id;
      SELECT count(*) INTO _players_count FROM public.players WHERE club_id = _membership.club_id;
      SELECT count(*) INTO _callups_count FROM public.call_ups WHERE club_id = _membership.club_id;

      IF _membership.created_by = _uid
        AND _membership.role IN ('owner'::public.club_role, 'admin'::public.club_role, 'coach'::public.club_role)
        AND _members_count = 1
        AND _players_count = 0
        AND _callups_count = 0
      THEN
        DELETE FROM public.clubs WHERE id = _membership.club_id;
      ELSE
        RETURN jsonb_build_object('ok', false, 'reason', 'already_in_other_club', 'club_id', _membership.club_id);
      END IF;
    END IF;
  END IF;

  INSERT INTO public.club_members (club_id, user_id, role)
  VALUES (_invite.club_id, _uid, _invite.role)
  ON CONFLICT (club_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.staff_invites
    SET accepted_at = now(), accepted_by = _uid
    WHERE id = _invite.id;

  RETURN jsonb_build_object('ok', true, 'reason', 'accepted', 'club_id', _invite.club_id, 'role', _invite.role);
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_player_to_club(_club_id uuid, _full_name text, _email text, _category_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cat uuid;
  v_token text;
  v_id uuid;
  v_name text := btrim(coalesce(_full_name, ''));
  v_email text := lower(btrim(coalesce(_email, '')));
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  IF v_name = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_name'); END IF;
  IF v_email = '' OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;

  v_cat := COALESCE(_category_id, (SELECT id FROM public.categories WHERE club_id = _club_id ORDER BY created_at ASC LIMIT 1));
  IF v_cat IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_category'); END IF;

  v_token := md5(gen_random_uuid()::text);

  INSERT INTO public.players (club_id, category_id, full_name, email, invite_token, invite_expires_at, invited_at)
  VALUES (_club_id, v_cat, v_name, v_email, v_token, now() + interval '14 days', now())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'player_id', v_id, 'invite_token', v_token);
END;
$function$;

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
    AND (_category_id IS NULL OR cu.category_id=_category_id)
    AND (_since IS NULL OR cu.starts_at >= _since::timestamptz);

  WITH ev AS (
    SELECT cu.id FROM public.call_ups cu
    WHERE cu.club_id=_club_id AND cu.starts_at < now()
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

CREATE OR REPLACE FUNCTION public.club_detail(_club_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_players jsonb;
  v_callups jsonb;
  v_staff jsonb;
  v_cats jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) INTO v_cats
  FROM (
    SELECT c.id AS category_id, c.name,
           (SELECT count(*) FROM players p WHERE p.category_id = c.id)::int AS jugadoras_total,
           (SELECT count(*) FROM players p WHERE p.category_id = c.id AND p.user_id IS NOT NULL)::int AS vinculadas,
           (SELECT count(*) FROM players p WHERE p.category_id = c.id AND p.user_id IS NULL)::int AS pendientes
    FROM categories c
    WHERE c.club_id = _club_id
    ORDER BY c.name
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) INTO v_players
  FROM (
    SELECT p.id AS player_id, p.full_name, p.email,
           (p.user_id IS NOT NULL) AS vinculada,
           (p.user_id IS NULL AND p.invite_expires_at IS NOT NULL AND p.invite_expires_at < now()) AS invite_expired
    FROM players p
    WHERE p.club_id = _club_id
    ORDER BY (p.user_id IS NOT NULL) DESC, p.full_name
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) INTO v_callups
  FROM (
    SELECT cu.id, cu.kind::text AS kind, cu.starts_at, cu.place,
           (SELECT count(*) FROM call_up_players x WHERE x.call_up_id = cu.id)::int AS total,
           (SELECT count(*) FROM call_up_players x WHERE x.call_up_id = cu.id AND x.status::text = 'going')::int AS van,
           (SELECT count(*) FROM call_up_players x WHERE x.call_up_id = cu.id AND x.status::text = 'declined')::int AS no_van,
           (SELECT count(*) FROM call_up_players x WHERE x.call_up_id = cu.id AND x.status::text NOT IN ('going','declined'))::int AS sin_responder
    FROM call_ups cu
    WHERE cu.club_id = _club_id
    ORDER BY cu.starts_at DESC
    LIMIT 8
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) INTO v_staff
  FROM (
    SELECT m.role::text AS role,
           u.email,
           COALESCE(
             (SELECT p.full_name FROM players p WHERE p.user_id = m.user_id AND p.club_id = _club_id LIMIT 1),
             NULLIF(u.raw_user_meta_data->>'full_name',''),
             NULLIF(u.raw_user_meta_data->>'name',''),
             split_part(u.email, '@', 1)
           ) AS name
    FROM club_members m
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.club_id = _club_id AND m.role IN ('owner','admin','coach')
    ORDER BY m.created_at ASC
  ) t;

  RETURN jsonb_build_object('categorias', v_cats, 'jugadoras', v_players, 'convocatorias', v_callups, 'staff', v_staff);
END;
$function$;

CREATE OR REPLACE FUNCTION public.club_pending_players(_club_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.full_name), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      p.id AS player_id,
      p.full_name,
      p.email,
      p.invite_token,
      (p.invite_expires_at IS NOT NULL AND p.invite_expires_at < now()) AS invite_expired
    FROM players p
    WHERE p.club_id = _club_id AND p.user_id IS NULL
    ORDER BY p.full_name
  ) t;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_my_club(_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _existing uuid;
  _created_without_membership uuid;
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _name IS NULL OR length(btrim(_name)) = 0 THEN
    RAISE EXCEPTION 'club name required';
  END IF;

  SELECT club_id INTO _existing
  FROM public.club_members
  WHERE user_id = _uid
  ORDER BY created_at ASC
  LIMIT 1;

  IF _existing IS NOT NULL THEN
    INSERT INTO public.categories (club_id, name)
    SELECT _existing, 'Primer equipo'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.categories WHERE club_id = _existing
    );
    RETURN _existing;
  END IF;

  SELECT id INTO _created_without_membership
  FROM public.clubs
  WHERE created_by = _uid
  ORDER BY created_at ASC
  LIMIT 1;

  IF _created_without_membership IS NOT NULL THEN
    INSERT INTO public.club_members (club_id, user_id, role)
    VALUES (_created_without_membership, _uid, 'admin'::public.club_role)
    ON CONFLICT (club_id, user_id)
    DO UPDATE SET role = 'admin'::public.club_role;

    INSERT INTO public.categories (club_id, name)
    SELECT _created_without_membership, 'Primer equipo'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.categories WHERE club_id = _created_without_membership
    );

    RETURN _created_without_membership;
  END IF;

  INSERT INTO public.clubs (name, created_by)
  VALUES (btrim(_name), _uid)
  RETURNING id INTO _new_id;

  INSERT INTO public.club_members (club_id, user_id, role)
  VALUES (_new_id, _uid, 'admin'::public.club_role)
  ON CONFLICT (club_id, user_id)
  DO UPDATE SET role = 'admin'::public.club_role;

  INSERT INTO public.categories (club_id, name)
  SELECT _new_id, 'Primer equipo'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories WHERE club_id = _new_id
  );

  RETURN _new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_club(_club_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  DELETE FROM public.call_up_players WHERE call_up_id IN (SELECT id FROM public.call_ups WHERE club_id = _club_id);
  DELETE FROM public.training_activities WHERE call_up_id IN (SELECT id FROM public.call_ups WHERE club_id = _club_id);
  DELETE FROM public.call_ups WHERE club_id = _club_id;
  DELETE FROM public.session_template_activities WHERE template_id IN (SELECT id FROM public.session_templates WHERE club_id = _club_id);
  DELETE FROM public.session_templates WHERE club_id = _club_id;
  DELETE FROM public.players WHERE club_id = _club_id;
  DELETE FROM public.categories WHERE club_id = _club_id;
  DELETE FROM public.club_members WHERE club_id = _club_id;
  DELETE FROM public.staff_invites WHERE club_id = _club_id;
  DELETE FROM public.club_crm WHERE club_id = _club_id;
  DELETE FROM public.clubs WHERE id = _club_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_player_invite(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row RECORD;
BEGIN
  IF _token IS NULL OR length(btrim(_token)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  SELECT p.id AS player_id, p.full_name, p.user_id, p.club_id, p.email, p.invite_expires_at, c.name AS club_name
  INTO _row
  FROM public.players p
  JOIN public.clubs c ON c.id = p.club_id
  WHERE p.invite_token = _token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'player_id', _row.player_id,
    'player_name', _row.full_name,
    'club_id', _row.club_id,
    'club_name', _row.club_name,
    'already_claimed', _row.user_id IS NOT NULL,
    'expired', (_row.invite_expires_at IS NOT NULL AND _row.invite_expires_at < now()),
    'expected_email_masked', public.mask_email(_row.email)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_staff_invite(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row RECORD;
BEGIN
  IF _token IS NULL OR length(btrim(_token)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  SELECT si.id, si.club_id, si.role, si.accepted_at, si.email, si.expires_at, c.name AS club_name
  INTO _row
  FROM public.staff_invites si
  JOIN public.clubs c ON c.id = si.club_id
  WHERE si.token = _token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'club_id', _row.club_id,
    'club_name', _row.club_name,
    'role', _row.role,
    'already_accepted', _row.accepted_at IS NOT NULL,
    'expired', (_row.expires_at IS NOT NULL AND _row.expires_at < now()),
    'expected_email_masked', public.mask_email(_row.email)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.platform_kpis()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_clubes int;
  v_total_jug int;
  v_vinc int;
  v_pend int;
  v_notif_users int;
  v_notif_pct int;
  v_nuevos int;
  v_por_vencer int;
  v_activos int;
  v_dormidos int;
  v_f_con_jug int;
  v_f_con_acep int;
  v_f_con_notif int;
  v_f_con_conv int;
  v_ingresos numeric;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT count(*)::int INTO v_total_clubes FROM clubs;
  SELECT count(*)::int INTO v_total_jug FROM players;
  SELECT count(*)::int INTO v_vinc FROM players WHERE user_id IS NOT NULL;
  v_pend := v_total_jug - v_vinc;

  SELECT count(DISTINCT p.user_id)::int INTO v_notif_users
  FROM players p
  WHERE p.user_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM push_subscriptions ps WHERE ps.user_id = p.user_id);

  v_notif_pct := COALESCE(round(v_notif_users::numeric / NULLIF(v_vinc, 0) * 100)::int, 0);

  SELECT count(*)::int INTO v_nuevos FROM clubs WHERE created_at > now() - interval '7 days';

  SELECT count(*)::int INTO v_por_vencer
  FROM clubs c
  WHERE (c.created_at + interval '30 days') > now()
    AND (c.created_at + interval '30 days') <= now() + interval '7 days';

  SELECT
    count(*) FILTER (WHERE est = 'dormido')::int,
    count(*) FILTER (WHERE est <> 'dormido')::int
  INTO v_dormidos, v_activos
  FROM (
    SELECT CASE
      WHEN act.ultima_actividad IS NULL OR act.ultima_actividad < now() - interval '21 days' THEN 'dormido'
      ELSE 'activo'
    END AS est
    FROM clubs c
    LEFT JOIN LATERAL (
      SELECT max(GREATEST(cu.starts_at, cu.created_at)) AS ultima_actividad
      FROM call_ups cu WHERE cu.club_id = c.id
    ) act ON TRUE
  ) s;

  SELECT count(*)::int INTO v_f_con_jug
  FROM clubs c WHERE EXISTS (SELECT 1 FROM players p WHERE p.club_id = c.id);

  SELECT count(*)::int INTO v_f_con_acep
  FROM clubs c WHERE EXISTS (SELECT 1 FROM players p WHERE p.club_id = c.id AND p.user_id IS NOT NULL);

  SELECT count(*)::int INTO v_f_con_notif
  FROM clubs c WHERE EXISTS (
    SELECT 1 FROM players p
    JOIN push_subscriptions ps ON ps.user_id = p.user_id
    WHERE p.club_id = c.id AND p.user_id IS NOT NULL
  );

  SELECT count(*)::int INTO v_f_con_conv
  FROM clubs c WHERE EXISTS (SELECT 1 FROM call_ups cu WHERE cu.club_id = c.id);

  SELECT COALESCE(sum(amount), 0) INTO v_ingresos
  FROM club_payments
  WHERE paid_at >= date_trunc('month', current_date)::date
    AND paid_at < (date_trunc('month', current_date) + interval '1 month')::date;

  RETURN jsonb_build_object(
    'total_clubes', v_total_clubes,
    'total_jugadoras', v_total_jug,
    'jugadoras_vinculadas', v_vinc,
    'jugadoras_pendientes', v_pend,
    'notif_adopcion_pct', v_notif_pct,
    'clubes_nuevos_semana', v_nuevos,
    'pruebas_por_vencer', v_por_vencer,
    'clubes_activos', v_activos,
    'clubes_dormidos', v_dormidos,
    'ingresos_mes', v_ingresos,
    'funnel', jsonb_build_object(
      'creados', v_total_clubes,
      'con_jugadoras', v_f_con_jug,
      'con_aceptada', v_f_con_acep,
      'con_notif', v_f_con_notif,
      'con_convocatoria', v_f_con_conv
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.platform_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.trial_days_left ASC, t.created_at DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      c.id AS club_id,
      c.name AS club_name,
      c.created_at,
      GREATEST(0, CEIL(EXTRACT(EPOCH FROM ((c.created_at + interval '30 days') - now())) / 86400.0))::int AS trial_days_left,
      adm.admin_name,
      adm.admin_email,
      (SELECT count(*) FROM categories cat WHERE cat.club_id = c.id)::int AS categorias_count,
      (SELECT count(*) FROM players p WHERE p.club_id = c.id)::int AS jugadoras_total,
      (SELECT count(*) FROM players p WHERE p.club_id = c.id AND p.user_id IS NOT NULL)::int AS jugadoras_vinculadas,
      (SELECT count(*) FROM players p WHERE p.club_id = c.id AND p.user_id IS NULL)::int AS jugadoras_pendientes,
      (SELECT count(*) FROM club_members m WHERE m.club_id = c.id AND m.role IN ('owner','admin','coach'))::int AS staff_count,
      notif.notif_activadas,
      (SELECT count(*) FROM call_ups cu WHERE cu.club_id = c.id)::int AS convocatorias_total,
      act.ultima_actividad,
      crm.status AS crm_status,
      crm.notes AS crm_notes,
      sub.paid_until,
      COALESCE(sub.blocked, false) AS blocked,
      CASE
        WHEN (SELECT count(*) FROM call_ups cu WHERE cu.club_id = c.id) = 0
             AND c.created_at > now() - interval '7 days' THEN 'nuevo'
        WHEN act.ultima_actividad IS NULL OR act.ultima_actividad < now() - interval '21 days' THEN 'dormido'
        ELSE 'activo'
      END AS estado
    FROM clubs c
    LEFT JOIN club_crm crm ON crm.club_id = c.id
    LEFT JOIN club_subscription sub ON sub.club_id = c.id
    LEFT JOIN LATERAL (
      SELECT
        COALESCE(
          (SELECT p.full_name FROM players p WHERE p.user_id = m.user_id AND p.club_id = c.id LIMIT 1),
          NULLIF(u.raw_user_meta_data->>'full_name',''),
          NULLIF(u.raw_user_meta_data->>'name',''),
          split_part(u.email, '@', 1)
        ) AS admin_name,
        u.email AS admin_email
      FROM club_members m
      JOIN auth.users u ON u.id = m.user_id
      WHERE m.club_id = c.id AND m.role IN ('owner','admin')
      ORDER BY (m.role = 'owner') DESC, m.created_at ASC
      LIMIT 1
    ) adm ON TRUE
    LEFT JOIN LATERAL (
      SELECT count(DISTINCT ps.user_id)::int AS notif_activadas
      FROM push_subscriptions ps
      WHERE ps.user_id IN (
        SELECT p.user_id FROM players p WHERE p.club_id = c.id AND p.user_id IS NOT NULL
      )
    ) notif ON TRUE
    LEFT JOIN LATERAL (
      SELECT max(GREATEST(cu.starts_at, cu.created_at)) AS ultima_actividad
      FROM call_ups cu WHERE cu.club_id = c.id
    ) act ON TRUE
  ) t;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_club_payment(_club_id uuid, _months integer, _amount numeric, _paid_at date, _note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base date;
  v_new date;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _months IS NULL OR _months <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_months');
  END IF;

  INSERT INTO public.club_payments (club_id, months, amount, paid_at, method, note, created_by)
  VALUES (_club_id, _months, _amount, COALESCE(_paid_at, current_date), 'yappy', _note, auth.uid());

  v_base := GREATEST(
    COALESCE(
      (SELECT paid_until FROM public.club_subscription WHERE club_id = _club_id),
      ((SELECT created_at FROM public.clubs WHERE id = _club_id)::date + 30)
    ),
    current_date
  );

  v_new := (v_base + (_months || ' months')::interval)::date;

  INSERT INTO public.club_subscription (club_id, paid_until, updated_at)
  VALUES (_club_id, v_new, now())
  ON CONFLICT (club_id) DO UPDATE SET paid_until = EXCLUDED.paid_until, updated_at = now();

  RETURN jsonb_build_object('ok', true, 'paid_until', v_new);
END;
$function$;

CREATE OR REPLACE FUNCTION public.regenerate_player_invite(_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_token text;
  v_found boolean;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT true, user_id INTO v_found, v_user FROM public.players WHERE id = _player_id;
  IF NOT COALESCE(v_found, false) THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF v_user IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed'); END IF;

  UPDATE public.players
     SET invite_token = md5(gen_random_uuid()::text),
         invite_expires_at = now() + interval '14 days',
         invited_at = now()
   WHERE id = _player_id
  RETURNING invite_token INTO v_token;

  RETURN jsonb_build_object('ok', true, 'invite_token', v_token);
END;
$function$;

CREATE OR REPLACE FUNCTION public.repair_my_club_membership()
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _club_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT club_id INTO _club_id
  FROM public.club_members
  WHERE user_id = _uid
  ORDER BY created_at ASC
  LIMIT 1;

  -- Already has a membership: do not touch role, just return it.
  IF _club_id IS NOT NULL THEN
    RETURN _club_id;
  END IF;

  -- No membership: if user created a club, restore admin membership.
  SELECT id INTO _club_id
  FROM public.clubs
  WHERE created_by = _uid
  ORDER BY created_at ASC
  LIMIT 1;

  IF _club_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.club_members (club_id, user_id, role)
  VALUES (_club_id, _uid, 'admin'::public.club_role)
  ON CONFLICT (club_id, user_id) DO NOTHING;

  INSERT INTO public.categories (club_id, name)
  SELECT _club_id, 'Primer equipo'
  WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE club_id = _club_id);

  RETURN _club_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_club_blocked(_club_id uuid, _blocked boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.club_subscription (club_id, blocked, updated_at)
  VALUES (_club_id, _blocked, now())
  ON CONFLICT (club_id) DO UPDATE SET blocked = EXCLUDED.blocked, updated_at = now();
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ---------------------------------------------------------------- Triggers

CREATE TRIGGER call_up_players_restrict_self_update BEFORE UPDATE ON public.call_up_players FOR EACH ROW EXECUTE FUNCTION public.call_up_players_restrict_self_update();
CREATE TRIGGER trg_call_up_players_updated BEFORE UPDATE ON public.call_up_players FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_call_ups_updated BEFORE UPDATE ON public.call_ups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER clubs_ensure_creator_membership AFTER INSERT ON public.clubs FOR EACH ROW EXECUTE FUNCTION public.ensure_club_creator_membership();
CREATE TRIGGER clubs_set_updated_at BEFORE UPDATE ON public.clubs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER players_restrict_self_update BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.players_restrict_self_update();
CREATE TRIGGER players_set_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------- RLS

ALTER TABLE public.call_up_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_template_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_activities ENABLE ROW LEVEL SECURITY;

-- call_up_players
CREATE POLICY "Players can delete their own call_up row" ON public.call_up_players FOR DELETE TO authenticated
  USING (public.is_player_self(player_id));
CREATE POLICY "Admins delete call-up players" ON public.call_up_players FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_club_admin(auth.uid(), c.club_id)));
CREATE POLICY "Admins add players to call-ups" ON public.call_up_players FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_club_admin(auth.uid(), c.club_id)));
CREATE POLICY "View call-up players" ON public.call_up_players FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_club_member(auth.uid(), c.club_id))) OR public.is_player_self(player_id));
CREATE POLICY "Staff mark attendance" ON public.call_up_players FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_club_staff(auth.uid(), c.club_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_club_staff(auth.uid(), c.club_id)));
CREATE POLICY "Update call-up players" ON public.call_up_players FOR UPDATE TO authenticated
  USING ((EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_club_admin(auth.uid(), c.club_id))) OR public.is_player_self(player_id))
  WITH CHECK ((EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = call_up_players.call_up_id AND public.is_club_admin(auth.uid(), c.club_id))) OR public.is_player_self(player_id));

-- call_ups
CREATE POLICY "Admins can delete call-ups" ON public.call_ups FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can create call-ups" ON public.call_ups FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin(auth.uid(), club_id) AND created_by = auth.uid());
CREATE POLICY "Members can view club call-ups" ON public.call_ups FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Admins can update call-ups" ON public.call_ups FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Club staff can update call_ups" ON public.call_ups FOR UPDATE TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id))
  WITH CHECK (public.is_club_staff(auth.uid(), club_id));

-- categories
CREATE POLICY "Admins delete categories" ON public.categories FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins insert categories" ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Club members can view categories" ON public.categories FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.club_members WHERE club_members.club_id = categories.club_id AND club_members.user_id = auth.uid()));
CREATE POLICY "Admins update categories" ON public.categories FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));

-- club_crm
CREATE POLICY "Solo la duena gestiona el CRM" ON public.club_crm FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- club_members
CREATE POLICY "Members can leave or creators can remove" ON public.club_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_members.club_id AND c.created_by = auth.uid()));
CREATE POLICY "Users can add themselves to clubs they created" ON public.club_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_members.club_id AND c.created_by = auth.uid()));
CREATE POLICY "Users can view their own membership" ON public.club_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Club creators can update memberships" ON public.club_members FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_members.club_id AND c.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_members.club_id AND c.created_by = auth.uid()));

-- club_payments
CREATE POLICY "pay_delete" ON public.club_payments FOR DELETE TO authenticated USING (public.is_platform_admin());
CREATE POLICY "pay_insert" ON public.club_payments FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY "pay_select" ON public.club_payments FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "pay_update" ON public.club_payments FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- club_subscription
CREATE POLICY "sub_delete" ON public.club_subscription FOR DELETE TO authenticated USING (public.is_platform_admin());
CREATE POLICY "sub_insert" ON public.club_subscription FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY "sub_select" ON public.club_subscription FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.club_members cm WHERE cm.club_id = club_subscription.club_id AND cm.user_id = auth.uid()));
CREATE POLICY "sub_update" ON public.club_subscription FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- clubs
CREATE POLICY "Creator can delete their club" ON public.clubs FOR DELETE TO authenticated
  USING (auth.uid() = created_by);
CREATE POLICY "Creator can insert clubs" ON public.clubs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Members and creators can view their club" ON public.clubs FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.club_members cm WHERE cm.club_id = clubs.id AND cm.user_id = auth.uid()));
CREATE POLICY "Club admins can update their club" ON public.clubs FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.club_members cm WHERE cm.club_id = clubs.id AND cm.user_id = auth.uid() AND cm.role = ANY (ARRAY['owner'::public.club_role, 'admin'::public.club_role])))
  WITH CHECK (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.club_members cm WHERE cm.club_id = clubs.id AND cm.user_id = auth.uid() AND cm.role = ANY (ARRAY['owner'::public.club_role, 'admin'::public.club_role])));

-- platform_admins
CREATE POLICY "Platform admins can view platform admins" ON public.platform_admins FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- players (la migración 20260915144757 reemplaza la política SELECT)
CREATE POLICY "Admins delete players" ON public.players FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins insert players" ON public.players FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Club members can view players" ON public.players FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.club_members WHERE club_members.club_id = players.club_id AND club_members.user_id = auth.uid()));
CREATE POLICY "Admins update players" ON public.players FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Player updates own row" ON public.players FOR UPDATE TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

-- push_subscriptions
CREATE POLICY "push_subs_delete_own" ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "push_subs_insert_own" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_subs_select_own" ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "push_subs_update_own" ON public.push_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- session_template_activities
CREATE POLICY "admins delete template activities" ON public.session_template_activities FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.session_templates t WHERE t.id = session_template_activities.template_id AND public.is_club_admin(auth.uid(), t.club_id)));
CREATE POLICY "admins insert template activities" ON public.session_template_activities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.session_templates t WHERE t.id = session_template_activities.template_id AND public.is_club_admin(auth.uid(), t.club_id)));
CREATE POLICY "members read template activities" ON public.session_template_activities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.session_templates t WHERE t.id = session_template_activities.template_id AND public.is_club_member(auth.uid(), t.club_id)));
CREATE POLICY "admins update template activities" ON public.session_template_activities FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.session_templates t WHERE t.id = session_template_activities.template_id AND public.is_club_admin(auth.uid(), t.club_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.session_templates t WHERE t.id = session_template_activities.template_id AND public.is_club_admin(auth.uid(), t.club_id)));

-- session_templates
CREATE POLICY "admins delete templates" ON public.session_templates FOR DELETE TO authenticated USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "admins insert templates" ON public.session_templates FOR INSERT TO authenticated WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "members read templates" ON public.session_templates FOR SELECT TO authenticated USING (public.is_club_member(auth.uid(), club_id));
CREATE POLICY "admins update templates" ON public.session_templates FOR UPDATE TO authenticated USING (public.is_club_admin(auth.uid(), club_id)) WITH CHECK (public.is_club_admin(auth.uid(), club_id));

-- staff_invites
CREATE POLICY "Admins can delete staff invites" ON public.staff_invites FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can create staff invites" ON public.staff_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin(auth.uid(), club_id) AND created_by = auth.uid());
CREATE POLICY "Admins can view staff invites of their club" ON public.staff_invites FOR SELECT TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admins can update staff invites" ON public.staff_invites FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));

-- training_activities
CREATE POLICY "admins delete training activities" ON public.training_activities FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = training_activities.call_up_id AND public.is_club_admin(auth.uid(), c.club_id)));
CREATE POLICY "admins insert training activities" ON public.training_activities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = training_activities.call_up_id AND public.is_club_admin(auth.uid(), c.club_id)));
CREATE POLICY "members can read training activities" ON public.training_activities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = training_activities.call_up_id AND public.is_club_member(auth.uid(), c.club_id)));
CREATE POLICY "admins update training activities" ON public.training_activities FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = training_activities.call_up_id AND public.is_club_admin(auth.uid(), c.club_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.call_ups c WHERE c.id = training_activities.call_up_id AND public.is_club_admin(auth.uid(), c.club_id)));

-- ---------------------------------------------------------------- Permisos de funciones
-- Igual que en Lovable: nada para anon; authenticated solo lo que la app llama.

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT EXECUTE ON FUNCTION public.accept_player_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_staff_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_player_to_club(uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_attendance_stats(uuid, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_pending_players(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_my_club(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_club(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_club_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_club_payment(uuid, integer, numeric, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_player_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.repair_my_club_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_club_blocked(uuid, boolean) TO authenticated;

-- ---------------------------------------------------------------- Archivos (Storage)

INSERT INTO storage.buckets (id, name, public) VALUES ('player-photos', 'player-photos', false)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "club admins delete club logo" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'club-logos' AND public.is_club_admin(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "club admins update club logo" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'club-logos' AND public.is_club_admin(auth.uid(), ((storage.foldername(name))[1])::uuid))
  WITH CHECK (bucket_id = 'club-logos' AND public.is_club_admin(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "club admins upload club logo" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'club-logos' AND public.is_club_admin(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "club logos readable by authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'club-logos');

CREATE POLICY "player_photos_delete_admins" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'player-photos' AND public.is_club_admin(auth.uid(), (split_part(name, '/', 1))::uuid));
CREATE POLICY "player_photos_delete_self" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'player-photos' AND (storage.foldername(name))[2] = 'self' AND public.is_player_self(((storage.foldername(name))[3])::uuid));
CREATE POLICY "player_photos_insert_admins" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'player-photos' AND public.is_club_admin(auth.uid(), (split_part(name, '/', 1))::uuid));
CREATE POLICY "player_photos_insert_self" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'player-photos' AND (storage.foldername(name))[2] = 'self' AND public.is_player_self(((storage.foldername(name))[3])::uuid));
CREATE POLICY "player_photos_read_members" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'player-photos' AND public.is_club_member(auth.uid(), (split_part(name, '/', 1))::uuid));
CREATE POLICY "player_photos_update_admins" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'player-photos' AND public.is_club_admin(auth.uid(), (split_part(name, '/', 1))::uuid))
  WITH CHECK (bucket_id = 'player-photos' AND public.is_club_admin(auth.uid(), (split_part(name, '/', 1))::uuid));
CREATE POLICY "player_photos_update_self" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'player-photos' AND (storage.foldername(name))[2] = 'self' AND public.is_player_self(((storage.foldername(name))[3])::uuid))
  WITH CHECK (bucket_id = 'player-photos' AND (storage.foldername(name))[2] = 'self' AND public.is_player_self(((storage.foldername(name))[3])::uuid));
