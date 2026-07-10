
-- 1) Restrict deal deletion to pending deals only
DROP POLICY IF EXISTS "Users can delete their own deals" ON public.deals;
CREATE POLICY "Users can delete their own pending deals"
  ON public.deals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id AND status = 'pending');

-- 2) Allow deal participants to view disputes on their deals
DROP POLICY IF EXISTS "Deal participants can view disputes on their deals" ON public.disputes;
CREATE POLICY "Deal participants can view disputes on their deals"
  ON public.disputes
  FOR SELECT
  TO authenticated
  USING (public.is_deal_participant(auth.uid(), deal_id));

-- 3) Hide giveaway winner_notes from public/authenticated reads
REVOKE SELECT (winner_notes) ON public.giveaways FROM anon, authenticated;
GRANT SELECT (winner_notes) ON public.giveaways TO service_role;
