-- Tarea 2 (privacidad de menores): una jugadora ya no puede leer las respuestas
-- de sus compañeras (motivo de "No puedo", bienestar, RPE, asistencia, cuándo
-- abrió la convocatoria). Solo el cuerpo técnico del club ve todas las filas;
-- cada jugadora ve únicamente la suya. Ninguna pantalla de jugadora usa las
-- filas de otras, así que la app no cambia para ella.
DROP POLICY IF EXISTS "View call-up players" ON public.call_up_players;

CREATE POLICY "Staff view call-up players, player views own row"
ON public.call_up_players
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.call_ups c
    WHERE c.id = call_up_players.call_up_id
      AND public.is_club_staff(auth.uid(), c.club_id)
  )
  OR public.is_player_self(player_id)
);
