REVOKE EXECUTE ON FUNCTION public.assign_deal_counterparty(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_deal_counterparty(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.assign_deal_counterparty(uuid, uuid) TO authenticated;