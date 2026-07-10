-- 1. Add creator_role column to deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS creator_role text NOT NULL DEFAULT 'buyer';

-- Enforce allowed values via trigger (CHECK constraints can be brittle; trigger lets us evolve)
CREATE OR REPLACE FUNCTION public.validate_deal_creator_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.creator_role IS NULL OR NEW.creator_role NOT IN ('buyer','seller') THEN
    RAISE EXCEPTION 'creator_role must be either buyer or seller (got %)', NEW.creator_role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deals_validate_creator_role ON public.deals;
CREATE TRIGGER deals_validate_creator_role
BEFORE INSERT OR UPDATE OF creator_role ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.validate_deal_creator_role();

-- 2. Enable realtime on deals + deal_messages so both parties see updates live.
-- REPLICA IDENTITY FULL ensures UPDATE payloads include the full new row.
ALTER TABLE public.deals REPLICA IDENTITY FULL;
ALTER TABLE public.deal_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  -- Add deals to realtime publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'deals'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.deals';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'deal_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_messages';
  END IF;
END $$;