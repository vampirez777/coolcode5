DROP POLICY IF EXISTS "Moderators can update non-cancellation deal fields" ON public.deals;

CREATE POLICY "Moderators can update non-cancellation deal fields"
ON public.deals
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (
  has_role(auth.uid(), 'moderator'::app_role)
  AND status <> 'cancelled'
  AND fee_percent           IS NOT DISTINCT FROM (SELECT d.fee_percent           FROM public.deals d WHERE d.id = deals.id)
  AND fee_amount            IS NOT DISTINCT FROM (SELECT d.fee_amount            FROM public.deals d WHERE d.id = deals.id)
  AND fee_set_by            IS NOT DISTINCT FROM (SELECT d.fee_set_by            FROM public.deals d WHERE d.id = deals.id)
  AND payout_hold           IS NOT DISTINCT FROM (SELECT d.payout_hold           FROM public.deals d WHERE d.id = deals.id)
  AND payout_hold_reason    IS NOT DISTINCT FROM (SELECT d.payout_hold_reason    FROM public.deals d WHERE d.id = deals.id)
  AND payout_hold_set_by    IS NOT DISTINCT FROM (SELECT d.payout_hold_set_by    FROM public.deals d WHERE d.id = deals.id)
  AND payout_hold_ticket_id IS NOT DISTINCT FROM (SELECT d.payout_hold_ticket_id FROM public.deals d WHERE d.id = deals.id)
);