-- Drop the overly restrictive CHECK constraint
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_status_check;

-- Replace with a trigger-based validator (more flexible to evolve)
CREATE OR REPLACE FUNCTION public.validate_deal_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS NULL OR NEW.status NOT IN (
    'pending',
    'select_user',
    'awaiting_deposit',
    'deposit_pending',
    'deposited',
    'in_progress',
    'item_delivered',
    'completed',
    'cancelled',
    'refunded',
    'disputed'
  ) THEN
    RAISE EXCEPTION 'Invalid deal status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deals_validate_status ON public.deals;
CREATE TRIGGER deals_validate_status
BEFORE INSERT OR UPDATE OF status ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.validate_deal_status();