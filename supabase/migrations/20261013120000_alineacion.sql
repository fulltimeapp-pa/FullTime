-- Alineación dentro de la hoja de partido (decidido con Bárbara, 13-oct; último punto de la lista de
-- Carlos Rivera). Solo se agregan columnas y una función; no se toca ninguna regla de acceso existente.
--   match_reports: de cuántas se juega (11, 9 o 7), el sistema ("4-3-3") y si el entrenador decidió
--                  mostrar la alineación a las jugadoras (apagado por defecto).
--   match_lineup:  dónde va cada titular en la cancha, en % (x: 0 izquierda → 100 derecha;
--                  y: 0 arco rival → 100 arco propio).
-- Quién ve qué: el cuerpo técnico de la categoría, siempre (con las reglas que ya existen). Las
-- jugadoras siguen viendo solo su propia fila en match_lineup. La alineación completa la ven
-- únicamente las convocadas de ese partido, únicamente si el entrenador la publicó, y solo con
-- nombre corto, dorsal y lugar (función match_lineup_shared).

ALTER TABLE public.match_reports
  ADD COLUMN field_size smallint NOT NULL DEFAULT 11 CHECK (field_size IN (7, 9, 11)),
  ADD COLUMN formation text CHECK (formation IS NULL OR formation ~ '^[1-9](-[1-9]){1,3}$'),
  ADD COLUMN lineup_published boolean NOT NULL DEFAULT false;

ALTER TABLE public.match_lineup
  ADD COLUMN pos_x numeric(4,1) CHECK (pos_x IS NULL OR pos_x BETWEEN 0 AND 100),
  ADD COLUMN pos_y numeric(4,1) CHECK (pos_y IS NULL OR pos_y BETWEEN 0 AND 100),
  ADD CONSTRAINT match_lineup_pos_both CHECK ((pos_x IS NULL) = (pos_y IS NULL)),
  ADD CONSTRAINT match_lineup_pos_only_titular CHECK (pos_x IS NULL OR role = 'titular');

-- Alineación para mostrar. Al cuerpo técnico de la categoría, siempre; a una convocada de ese
-- partido, solo si está publicada. A cualquier otra persona no le devuelve nada.
-- De las compañeras sale lo mínimo: primer nombre + inicial del apellido y dorsal.
CREATE OR REPLACE FUNCTION public.match_lineup_shared(_call_up_id uuid)
 RETURNS TABLE (player_id uuid, short_name text, jersey_number integer, role text, pos_x numeric, pos_y numeric)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT l.player_id,
         split_part(btrim(p.full_name), ' ', 1)
           || CASE WHEN position(' ' IN btrim(p.full_name)) > 0
                   THEN ' ' || left(regexp_replace(btrim(p.full_name), '^.*\s', ''), 1) || '.'
                   ELSE '' END,
         p.jersey_number::integer,
         l.role,
         l.pos_x,
         l.pos_y
  FROM public.match_lineup l
  JOIN public.players p ON p.id = l.player_id
  JOIN public.call_ups c ON c.id = l.call_up_id
  JOIN public.match_reports r ON r.call_up_id = l.call_up_id
  WHERE l.call_up_id = _call_up_id
    AND (
      public.is_category_staff(auth.uid(), c.club_id, c.category_id)
      OR (
        r.lineup_published
        AND EXISTS (
          SELECT 1 FROM public.call_up_players cp
          WHERE cp.call_up_id = _call_up_id AND public.is_player_self(cp.player_id)
        )
      )
    );
$function$;

REVOKE ALL ON FUNCTION public.match_lineup_shared(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_lineup_shared(uuid) TO authenticated, service_role;
