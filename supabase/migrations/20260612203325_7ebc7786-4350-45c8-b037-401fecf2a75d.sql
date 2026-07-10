-- 1) Block participants from writing admin-only deal columns
DROP POLICY IF EXISTS "Users can update their own deals" ON public.deals;

CREATE POLICY "Users can update their own deals"
ON public.deals
FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id OR auth.uid() = other_user_id)
WITH CHECK (
  (auth.uid() = creator_id OR auth.uid() = other_user_id)
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR auth.role() = 'service_role'
    OR (
      fee_percent           IS NOT DISTINCT FROM (SELECT fee_percent           FROM public.deals d WHERE d.id = deals.id)
      AND fee_amount        IS NOT DISTINCT FROM (SELECT fee_amount            FROM public.deals d WHERE d.id = deals.id)
      AND fee_set_by        IS NOT DISTINCT FROM (SELECT fee_set_by            FROM public.deals d WHERE d.id = deals.id)
      AND payout_hold       IS NOT DISTINCT FROM (SELECT payout_hold           FROM public.deals d WHERE d.id = deals.id)
      AND payout_hold_reason IS NOT DISTINCT FROM (SELECT payout_hold_reason   FROM public.deals d WHERE d.id = deals.id)
      AND payout_hold_set_by IS NOT DISTINCT FROM (SELECT payout_hold_set_by   FROM public.deals d WHERE d.id = deals.id)
      AND payout_hold_ticket_id IS NOT DISTINCT FROM (SELECT payout_hold_ticket_id FROM public.deals d WHERE d.id = deals.id)
      AND creator_id        IS NOT DISTINCT FROM (SELECT creator_id            FROM public.deals d WHERE d.id = deals.id)
      AND creator_role      IS NOT DISTINCT FROM (SELECT creator_role          FROM public.deals d WHERE d.id = deals.id)
    )
  )
);

-- 2) Stop exposing giveaways.winner_notes to the public
DROP POLICY IF EXISTS "Anyone can view giveaways" ON public.giveaways;
DROP POLICY IF EXISTS "Public can view giveaways" ON public.giveaways;
DROP POLICY IF EXISTS "Public read giveaways" ON public.giveaways;

CREATE POLICY "Authenticated can view giveaways"
ON public.giveaways
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.giveaways FROM anon;

-- Public-safe view for unauthenticated visitors (omits winner_notes).
CREATE OR REPLACE VIEW public.giveaways_public
WITH (security_invoker = true) AS
SELECT
  id, title, description, prize, image_url, winners_count,
  entry_requirements, ends_at, is_active, created_by, created_at, updated_at
FROM public.giveaways;

GRANT SELECT ON public.giveaways_public TO anon, authenticated;
