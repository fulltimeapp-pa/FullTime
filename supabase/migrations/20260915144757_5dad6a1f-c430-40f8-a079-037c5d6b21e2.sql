DROP POLICY IF EXISTS "Club members can view players" ON public.players;

CREATE POLICY "Staff view club players, player views own row"
ON public.players
FOR SELECT
TO authenticated
USING (
  public.is_club_staff(auth.uid(), club_id)
  OR (user_id IS NOT NULL AND user_id = auth.uid())
);