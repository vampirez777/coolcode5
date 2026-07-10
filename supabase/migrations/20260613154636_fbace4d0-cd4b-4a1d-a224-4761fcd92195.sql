CREATE OR REPLACE FUNCTION public.assign_deal_counterparty(_deal_id uuid, _other_user_id uuid)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_deal public.deals;
  assigned_wallet text;
  updated_deal public.deals;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO target_deal
  FROM public.deals
  WHERE id = _deal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found';
  END IF;

  IF target_deal.creator_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not allowed to update this deal';
  END IF;

  IF _other_user_id = target_deal.creator_id THEN
    RAISE EXCEPTION 'Cannot add yourself to the deal';
  END IF;

  IF target_deal.status NOT IN ('select_user', 'pending') THEN
    RAISE EXCEPTION 'This deal is not ready for user assignment';
  END IF;

  SELECT wallet_address INTO assigned_wallet
  FROM public.escrow_wallets
  WHERE coin = target_deal.coin
    AND network = target_deal.coin_network
    AND is_active = true
  ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  LIMIT 1;

  UPDATE public.deals
  SET other_user_id = _other_user_id,
      escrow_wallet_address = assigned_wallet
  WHERE id = _deal_id
  RETURNING * INTO updated_deal;

  RETURN updated_deal;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_deal_counterparty(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can view active wallets" ON public.escrow_wallets;
DROP POLICY IF EXISTS "Admins can view wallets" ON public.escrow_wallets;
CREATE POLICY "Admins can view wallets"
ON public.escrow_wallets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Authenticated can view giveaway public columns" ON public.giveaways;
DROP POLICY IF EXISTS "Authenticated can view giveaways" ON public.giveaways;
DROP POLICY IF EXISTS "Anyone can view giveaways" ON public.giveaways;
DROP POLICY IF EXISTS "Admins can view giveaways" ON public.giveaways;
CREATE POLICY "Admins can view giveaways"
ON public.giveaways
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT ON public.giveaways TO authenticated;
GRANT SELECT ON public.giveaways_public TO anon, authenticated;
GRANT SELECT ON public.escrow_wallets TO authenticated;
GRANT ALL ON public.escrow_wallets TO service_role;
GRANT ALL ON public.giveaways TO service_role;