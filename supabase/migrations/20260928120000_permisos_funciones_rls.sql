-- Arreglo: las reglas de acceso (RLS) llaman a is_club_member, is_club_staff e
-- is_player_self, pero los usuarios con sesión no tenían permiso para
-- ejecutarlas. Resultado: "permission denied for function is_club_member" al
-- leer convocatorias, y la lista de jugadoras fallaba para todos. Por eso crear
-- una convocatoria nunca funcionó.
GRANT EXECUTE ON FUNCTION public.is_club_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_club_staff(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_player_self(uuid) TO authenticated;

-- El detalle de la convocatoria escucha cambios en call_up_players para que el
-- profe vea las respuestas en vivo, pero la tabla nunca se agregó a Realtime.
-- Realtime respeta las mismas reglas de acceso (RLS).
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_up_players;
