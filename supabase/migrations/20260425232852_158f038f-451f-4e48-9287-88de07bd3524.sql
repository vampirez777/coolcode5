-- ============= Deals: fee + hold fields =============
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS fee_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_amount numeric,
  ADD COLUMN IF NOT EXISTS fee_set_by uuid,
  ADD COLUMN IF NOT EXISTS fee_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payout_hold_reason text,
  ADD COLUMN IF NOT EXISTS payout_hold_set_by uuid,
  ADD COLUMN IF NOT EXISTS payout_hold_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_hold_ticket_id uuid,
  ADD COLUMN IF NOT EXISTS last_fee_change_seen_by_creator timestamptz,
  ADD COLUMN IF NOT EXISTS last_fee_change_seen_by_other timestamptz;

-- ============= Fee history table =============
CREATE TABLE IF NOT EXISTS public.fee_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  old_percent numeric NOT NULL,
  new_percent numeric NOT NULL,
  changed_by uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all fee history"
  ON public.fee_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Participants view own deal fee history"
  ON public.fee_history FOR SELECT TO authenticated
  USING (public.is_deal_participant(auth.uid(), deal_id));

CREATE POLICY "Admins insert fee history"
  ON public.fee_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND changed_by = auth.uid());

-- ============= Trigger: log fee change + chat + notify =============
CREATE OR REPLACE FUNCTION public.handle_deal_fee_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  poster uuid;
  msg text;
  fee_label text;
BEGIN
  IF NEW.fee_percent IS NULL OR OLD.fee_percent IS NULL THEN RETURN NEW; END IF;
  IF NEW.fee_percent = OLD.fee_percent THEN RETURN NEW; END IF;

  -- Log to fee_history (no actor check here — RLS already gated the UPDATE)
  INSERT INTO public.fee_history (deal_id, old_percent, new_percent, changed_by, note)
  VALUES (NEW.id, OLD.fee_percent, NEW.fee_percent, COALESCE(NEW.fee_set_by, auth.uid()), NULL);

  fee_label := CASE
    WHEN NEW.fee_percent > OLD.fee_percent THEN 'increased'
    WHEN NEW.fee_percent < OLD.fee_percent THEN 'decreased'
    ELSE 'updated'
  END;

  msg := '⚠️ Deal fee ' || fee_label || ' from ' || OLD.fee_percent::text || '% to ' || NEW.fee_percent::text || '% by an administrator.';

  poster := COALESCE(NEW.fee_set_by, NEW.creator_id, NEW.other_user_id);
  IF poster IS NOT NULL THEN
    INSERT INTO public.deal_messages (deal_id, sender_id, message)
    VALUES (NEW.id, poster, msg);
  END IF;

  -- Notify both parties
  IF NEW.creator_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, deal_id)
    VALUES (NEW.creator_id, 'fee_change',
      'Deal fee ' || fee_label,
      'Fee changed from ' || OLD.fee_percent::text || '% to ' || NEW.fee_percent::text || '%.',
      NEW.id);
  END IF;
  IF NEW.other_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, deal_id)
    VALUES (NEW.other_user_id, 'fee_change',
      'Deal fee ' || fee_label,
      'Fee changed from ' || OLD.fee_percent::text || '% to ' || NEW.fee_percent::text || '%.',
      NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_deal_fee_change_trg ON public.deals;
CREATE TRIGGER handle_deal_fee_change_trg
  AFTER UPDATE OF fee_percent ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_deal_fee_change();

-- ============= Trigger: payout hold lifecycle =============
CREATE OR REPLACE FUNCTION public.handle_deal_payout_hold()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ticket_id uuid;
  poster uuid;
  reason_text text;
BEGIN
  -- Only react to actual transitions
  IF NEW.payout_hold IS DISTINCT FROM OLD.payout_hold THEN
    poster := COALESCE(NEW.payout_hold_set_by, NEW.creator_id, NEW.other_user_id);
    reason_text := COALESCE(NEW.payout_hold_reason, 'Security review');

    IF NEW.payout_hold = true THEN
      -- Auto-open support ticket if not yet linked
      IF NEW.payout_hold_ticket_id IS NULL AND NEW.creator_id IS NOT NULL THEN
        INSERT INTO public.support_tickets (user_id, deal_id, subject, status)
        VALUES (NEW.creator_id, NEW.id, 'Security hold on your deal', 'open')
        RETURNING id INTO ticket_id;

        NEW.payout_hold_ticket_id := ticket_id;

        -- Initial support message explaining the hold
        IF poster IS NOT NULL THEN
          INSERT INTO public.support_messages (ticket_id, sender_id, message)
          VALUES (ticket_id, poster,
            'A security hold has been placed on this deal payout. Reason: ' || reason_text ||
            E'\n\nOur team is reviewing the transaction. We will release the funds as soon as the review is complete. Please reply here if you have any information that can help.');
        END IF;
      END IF;

      -- System chat message on the deal
      IF poster IS NOT NULL THEN
        INSERT INTO public.deal_messages (deal_id, sender_id, message)
        VALUES (NEW.id, poster,
          '🔒 Payout placed on security hold by an administrator. Reason: ' || reason_text || '. A support ticket has been opened.');
      END IF;

      -- Notify both parties
      IF NEW.creator_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, body, deal_id)
        VALUES (NEW.creator_id, 'payout_hold', 'Payout on security hold', reason_text, NEW.id);
      END IF;
      IF NEW.other_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, body, deal_id)
        VALUES (NEW.other_user_id, 'payout_hold', 'Payout on security hold', reason_text, NEW.id);
      END IF;

    ELSE
      -- Hold released
      IF poster IS NOT NULL THEN
        INSERT INTO public.deal_messages (deal_id, sender_id, message)
        VALUES (NEW.id, poster, '✅ Security hold released. Payout can now proceed normally.');
      END IF;

      IF NEW.creator_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, body, deal_id)
        VALUES (NEW.creator_id, 'payout_hold', 'Security hold released', 'The hold on this deal has been lifted.', NEW.id);
      END IF;
      IF NEW.other_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, body, deal_id)
        VALUES (NEW.other_user_id, 'payout_hold', 'Security hold released', 'The hold on this deal has been lifted.', NEW.id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_deal_payout_hold_trg ON public.deals;
-- Use BEFORE so we can set NEW.payout_hold_ticket_id and have it persisted
CREATE TRIGGER handle_deal_payout_hold_trg
  BEFORE UPDATE OF payout_hold ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_deal_payout_hold();

-- ============= RLS: restrict who can write fee + hold fields =============
-- Existing policy "Users can update their own deals" allows participants to UPDATE the row;
-- we add a CHECK so non-admins cannot mutate fee/hold fields.
CREATE OR REPLACE FUNCTION public.guard_deal_admin_fields()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  is_admin_caller boolean;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  is_admin_caller := caller IS NOT NULL AND public.has_role(caller, 'admin'::app_role);

  -- Block fee changes by non-admins
  IF NEW.fee_percent IS DISTINCT FROM OLD.fee_percent AND NOT is_admin_caller THEN
    RAISE EXCEPTION 'Only admins can change deal fees';
  END IF;
  IF NEW.fee_amount IS DISTINCT FROM OLD.fee_amount AND NOT is_admin_caller THEN
    RAISE EXCEPTION 'Only admins can change deal fee amount';
  END IF;

  -- Block hold changes by non-admins
  IF NEW.payout_hold IS DISTINCT FROM OLD.payout_hold AND NOT is_admin_caller THEN
    RAISE EXCEPTION 'Only admins can change payout hold';
  END IF;
  IF NEW.payout_hold_reason IS DISTINCT FROM OLD.payout_hold_reason AND NOT is_admin_caller THEN
    RAISE EXCEPTION 'Only admins can change payout hold reason';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_deal_admin_fields_trg ON public.deals;
CREATE TRIGGER guard_deal_admin_fields_trg
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.guard_deal_admin_fields();