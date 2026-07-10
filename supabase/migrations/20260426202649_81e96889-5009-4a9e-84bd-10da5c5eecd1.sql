
-- 1. Table
CREATE TABLE public.deal_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  picked_role text NOT NULL CHECK (picked_role IN ('sender','receiver')),
  confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, user_id)
);

CREATE INDEX idx_dra_deal ON public.deal_role_assignments(deal_id);

-- 2. updated_at trigger
CREATE TRIGGER trg_dra_updated_at
BEFORE UPDATE ON public.deal_role_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. RLS
ALTER TABLE public.deal_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view role assignments on their deals"
ON public.deal_role_assignments
FOR SELECT
TO authenticated
USING (public.is_deal_participant(auth.uid(), deal_id));

CREATE POLICY "Admins view all role assignments"
ON public.deal_role_assignments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators view all role assignments"
ON public.deal_role_assignments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Participants insert own role assignment"
ON public.deal_role_assignments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_deal_participant(auth.uid(), deal_id));

CREATE POLICY "Participants update own role assignment"
ON public.deal_role_assignments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND public.is_deal_participant(auth.uid(), deal_id))
WITH CHECK (auth.uid() = user_id AND public.is_deal_participant(auth.uid(), deal_id));

-- 4. Reset-the-other-side trigger
-- When a row's picked_role changes, also clear the OTHER participant's confirmed flag.
-- The row that's being changed itself has its own `confirmed` cleared via the same trigger
-- (BEFORE UPDATE) when the pick changes.
CREATE OR REPLACE FUNCTION public.reset_role_confirmations_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.picked_role IS DISTINCT FROM OLD.picked_role THEN
    -- Clear my own confirmation since I changed my pick
    NEW.confirmed := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dra_reset_self
BEFORE UPDATE ON public.deal_role_assignments
FOR EACH ROW EXECUTE FUNCTION public.reset_role_confirmations_on_change();

-- After-update: if I changed my pick, clear the other side's confirmation too
CREATE OR REPLACE FUNCTION public.reset_other_role_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.picked_role IS DISTINCT FROM OLD.picked_role THEN
    UPDATE public.deal_role_assignments
       SET confirmed = false
     WHERE deal_id = NEW.deal_id
       AND user_id <> NEW.user_id
       AND confirmed = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dra_reset_other
AFTER UPDATE ON public.deal_role_assignments
FOR EACH ROW EXECUTE FUNCTION public.reset_other_role_confirmation();

-- 5. Both-confirmed handler: when both sides have complementary confirmed picks,
-- bump the deal to awaiting_deposit and set creator_role.
CREATE OR REPLACE FUNCTION public.handle_role_assignment_agreement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal record;
  v_creator_pick text;
  v_other_pick text;
  v_creator_confirmed boolean;
  v_other_confirmed boolean;
  v_creator_role text;
  v_count int;
BEGIN
  SELECT * INTO v_deal FROM public.deals WHERE id = NEW.deal_id;
  IF v_deal IS NULL THEN RETURN NEW; END IF;

  -- Only proceed for deals that are still in pre-deposit phase
  IF v_deal.status NOT IN ('select_user','pending') THEN
    RETURN NEW;
  END IF;

  IF v_deal.creator_id IS NULL OR v_deal.other_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT picked_role, confirmed INTO v_creator_pick, v_creator_confirmed
    FROM public.deal_role_assignments
   WHERE deal_id = NEW.deal_id AND user_id = v_deal.creator_id;
  SELECT picked_role, confirmed INTO v_other_pick, v_other_confirmed
    FROM public.deal_role_assignments
   WHERE deal_id = NEW.deal_id AND user_id = v_deal.other_user_id;

  IF v_creator_pick IS NULL OR v_other_pick IS NULL THEN RETURN NEW; END IF;
  IF NOT v_creator_confirmed OR NOT v_other_confirmed THEN RETURN NEW; END IF;
  IF v_creator_pick = v_other_pick THEN RETURN NEW; END IF; -- both picked same side, not complementary

  -- creator_role is buyer when creator picked sender (they send the crypto / pay)
  v_creator_role := CASE WHEN v_creator_pick = 'sender' THEN 'buyer' ELSE 'seller' END;

  UPDATE public.deals
     SET status = 'awaiting_deposit',
         creator_role = v_creator_role
   WHERE id = NEW.deal_id;

  -- System chat message
  INSERT INTO public.deal_messages (deal_id, sender_id, message)
  VALUES (NEW.deal_id, v_deal.creator_id,
    '✅ Roles confirmed by both parties. Awaiting deposit.');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dra_agreement
AFTER INSERT OR UPDATE ON public.deal_role_assignments
FOR EACH ROW EXECUTE FUNCTION public.handle_role_assignment_agreement();

-- 6. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_role_assignments;
ALTER TABLE public.deal_role_assignments REPLICA IDENTITY FULL;
