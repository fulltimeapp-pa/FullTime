-- Wellness y RPE con formularios editables (decidido con Bárbara el 9-oct, a pedido de Carlos Rivera).
-- club_forms:     formularios del club (tipo Google Forms). Si un club no tiene, la app usa las
--                 plantillas por defecto (sueño, energía, ánimo, molestias, estrés / RPE 1-10).
-- form_responses: lo que respondió cada jugadora en cada entreno. Las respuestas guardan la pregunta
--                 tal como estaba, así el historial no se rompe si después se edita el formulario.
-- Las columnas viejas wellness_* y rpe de call_up_players se mantienen (historial anterior).

CREATE TABLE public.club_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('wellness', 'rpe')),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  questions jsonb NOT NULL CHECK (jsonb_typeof(questions) = 'array' AND jsonb_array_length(questions) BETWEEN 1 AND 30),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Un solo formulario por defecto por club y tipo.
CREATE UNIQUE INDEX club_forms_one_default ON public.club_forms (club_id, kind) WHERE is_default;
CREATE TRIGGER club_forms_set_updated_at BEFORE UPDATE ON public.club_forms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Qué formulario usa cada entreno (vacío = el de por defecto del club).
ALTER TABLE public.call_ups
  ADD COLUMN wellness_form_id uuid REFERENCES public.club_forms(id) ON DELETE SET NULL,
  ADD COLUMN rpe_form_id uuid REFERENCES public.club_forms(id) ON DELETE SET NULL;

CREATE TABLE public.form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_up_id uuid NOT NULL REFERENCES public.call_ups(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('wellness', 'rpe')),
  form_id uuid REFERENCES public.club_forms(id) ON DELETE SET NULL,
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'array'),
  score numeric(4,2) CHECK (score IS NULL OR score BETWEEN 0 AND 10), -- wellness 1-5 / RPE 1-10
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (call_up_id, player_id, kind)
);
CREATE INDEX form_responses_player_idx ON public.form_responses (player_id, submitted_at);
CREATE INDEX form_responses_club_idx ON public.form_responses (club_id, submitted_at);
CREATE TRIGGER form_responses_set_updated_at BEFORE UPDATE ON public.form_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- El club sale de la convocatoria; la jugadora tiene que estar convocada y no puede cambiar
-- de convocatoria ni de jugadora una respuesta ya hecha.
CREATE OR REPLACE FUNCTION public.form_responses_check()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.call_up_id <> OLD.call_up_id OR NEW.player_id <> OLD.player_id OR NEW.kind <> OLD.kind) THEN
    RAISE EXCEPTION 'No se puede mover una respuesta.';
  END IF;
  SELECT club_id INTO NEW.club_id FROM public.call_ups WHERE id = NEW.call_up_id;
  IF NEW.club_id IS NULL THEN RAISE EXCEPTION 'No encontramos ese entreno.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.call_up_players cp WHERE cp.call_up_id = NEW.call_up_id AND cp.player_id = NEW.player_id) THEN
    RAISE EXCEPTION 'Esa jugadora no está convocada.';
  END IF;
  IF NEW.form_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.club_forms f WHERE f.id = NEW.form_id AND f.club_id = NEW.club_id) THEN
    RAISE EXCEPTION 'Ese formulario no es de este club.';
  END IF;
  RETURN NEW;
END $function$;
CREATE TRIGGER form_responses_check BEFORE INSERT OR UPDATE ON public.form_responses
  FOR EACH ROW EXECUTE FUNCTION public.form_responses_check();

-- Un entreno solo puede apuntar a formularios de su propio club.
CREATE OR REPLACE FUNCTION public.call_ups_forms_same_club()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.wellness_form_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.club_forms f WHERE f.id = NEW.wellness_form_id AND f.club_id = NEW.club_id AND f.kind = 'wellness'))
     OR (NEW.rpe_form_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.club_forms f WHERE f.id = NEW.rpe_form_id AND f.club_id = NEW.club_id AND f.kind = 'rpe')) THEN
    RAISE EXCEPTION 'Ese formulario no es de este club.';
  END IF;
  RETURN NEW;
END $function$;
CREATE TRIGGER call_ups_forms_same_club BEFORE INSERT OR UPDATE OF wellness_form_id, rpe_form_id, club_id ON public.call_ups
  FOR EACH ROW EXECUTE FUNCTION public.call_ups_forms_same_club();

ALTER TABLE public.club_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Formularios: todo el club los lee (la jugadora necesita ver las preguntas); el cuerpo técnico los edita.
CREATE POLICY "Club lee sus formularios" ON public.club_forms FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), club_id));
CREATE POLICY "Staff gestiona formularios" ON public.club_forms FOR ALL TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id))
  WITH CHECK (public.is_club_staff(auth.uid(), club_id));

-- Respuestas: el cuerpo técnico ve todas las de su club; cada jugadora solo las suyas y solo
-- ella responde por sí misma. Las compañeras no se ven entre sí.
CREATE POLICY "Staff ve respuestas del club" ON public.form_responses FOR SELECT TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id));
CREATE POLICY "Staff borra respuestas del club" ON public.form_responses FOR DELETE TO authenticated
  USING (public.is_club_staff(auth.uid(), club_id));
CREATE POLICY "Jugadora ve sus respuestas" ON public.form_responses FOR SELECT TO authenticated
  USING (public.is_player_self(player_id));
CREATE POLICY "Jugadora responde por sí misma" ON public.form_responses FOR INSERT TO authenticated
  WITH CHECK (public.is_player_self(player_id));
CREATE POLICY "Jugadora corrige su respuesta" ON public.form_responses FOR UPDATE TO authenticated
  USING (public.is_player_self(player_id))
  WITH CHECK (public.is_player_self(player_id));
