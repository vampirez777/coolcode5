-- Add amount-agreement columns to deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS amount_creator NUMERIC,
  ADD COLUMN IF NOT EXISTS amount_other NUMERIC,
  ADD COLUMN IF NOT EXISTS amount_confirmed_by_creator BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount_confirmed_by_other BOOLEAN NOT NULL DEFAULT false;

-- Trigger: when both sides confirm AND amounts match, sync deals.amount.
CREATE OR REPLACE FUNCTION public.sync_agreed_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.amount_confirmed_by_creator
     AND NEW.amount_confirmed_by_other
     AND NEW.amount_creator IS NOT NULL
     AND NEW.amount_other  IS NOT NULL
     AND NEW.amount_creator = NEW.amount_other THEN
    NEW.amount := NEW.amount_creator;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_agreed_amount ON public.deals;
CREATE TRIGGER trg_sync_agreed_amount
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.sync_agreed_amount();
