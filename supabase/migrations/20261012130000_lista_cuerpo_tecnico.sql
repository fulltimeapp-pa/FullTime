-- Lista del cuerpo técnico de un club, con nombre y correo (12-oct).
-- Arregla que en Equipo la dueña solo se veía a sí misma: la tabla club_members deja leer a cada
-- persona únicamente su propia fila, y eso no se toca. Esta función devuelve la lista completa solo
-- a quien es del cuerpo técnico de ese club; el correo de los demás solo lo ve el dueño o admin.
CREATE OR REPLACE FUNCTION public.club_staff_list(_club_id uuid)
 RETURNS TABLE (id uuid, user_id uuid, role public.club_role, created_at timestamptz, display_name text, email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin boolean := public.is_club_admin(auth.uid(), _club_id);
BEGIN
  IF NOT public.is_club_staff(auth.uid(), _club_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT m.id, m.user_id, m.role, m.created_at,
    COALESCE(
      NULLIF(btrim(u.raw_user_meta_data->>'full_name'), ''),
      NULLIF(btrim(u.raw_user_meta_data->>'name'), ''),
      split_part(u.email, '@', 1),
      'Sin nombre'
    )::text AS display_name,
    CASE WHEN _admin OR m.user_id = auth.uid() THEN u.email::text END AS email
  FROM public.club_members m
  LEFT JOIN auth.users u ON u.id = m.user_id
  WHERE m.club_id = _club_id
    AND m.role IN ('owner'::public.club_role, 'admin'::public.club_role, 'coach'::public.club_role)
  ORDER BY m.created_at;
END $function$;
REVOKE ALL ON FUNCTION public.club_staff_list(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.club_staff_list(uuid) TO authenticated;
