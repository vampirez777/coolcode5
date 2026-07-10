-- Status change notification function
CREATE OR REPLACE FUNCTION public.notify_deal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_label TEXT;
  title_text TEXT;
  body_text TEXT;
BEGIN
  IF NEW.status IS NULL OR OLD.status IS NULL OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Friendly labels
  status_label := CASE NEW.status
    WHEN 'awaiting_deposit' THEN 'Awaiting deposit'
    WHEN 'deposit_pending' THEN 'Deposit reported by buyer'
    WHEN 'deposited' THEN 'Funds secured in escrow'
    WHEN 'item_delivered' THEN 'Item confirmed by buyer'
    WHEN 'completed' THEN 'Funds released — deal complete'
    WHEN 'cancelled' THEN 'Deal cancelled'
    WHEN 'refunded' THEN 'Buyer refunded'
    WHEN 'disputed' THEN 'Deal in dispute'
    ELSE NEW.status
  END;

  title_text := 'Deal update: ' || status_label;
  body_text := COALESCE(NEW.coin, 'Deal') || ' • $' || COALESCE(NEW.amount::text, '0');

  -- Notify creator (buyer)
  IF NEW.creator_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, deal_id)
    VALUES (NEW.creator_id, 'deal_status', title_text, body_text, NEW.id);
  END IF;

  -- Notify other_user (seller)
  IF NEW.other_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, deal_id)
    VALUES (NEW.other_user_id, 'deal_status', title_text, body_text, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deals_notify_status_change ON public.deals;
CREATE TRIGGER deals_notify_status_change
AFTER UPDATE OF status ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.notify_deal_status_change();

-- Wire up existing notification triggers if missing
DROP TRIGGER IF EXISTS deals_notify_invitation ON public.deals;
CREATE TRIGGER deals_notify_invitation
AFTER UPDATE OF other_user_id ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.notify_deal_invitation();

DROP TRIGGER IF EXISTS deal_messages_notify_new ON public.deal_messages;
CREATE TRIGGER deal_messages_notify_new
AFTER INSERT ON public.deal_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

DROP TRIGGER IF EXISTS disputes_handle_created ON public.disputes;
CREATE TRIGGER disputes_handle_created
AFTER INSERT ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.handle_dispute_created();

-- updated_at triggers for tables with the column
DROP TRIGGER IF EXISTS deals_set_updated_at ON public.deals;
CREATE TRIGGER deals_set_updated_at BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS disputes_set_updated_at ON public.disputes;
CREATE TRIGGER disputes_set_updated_at BEFORE UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS support_tickets_set_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_set_updated_at BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS escrow_wallets_set_updated_at ON public.escrow_wallets;
CREATE TRIGGER escrow_wallets_set_updated_at BEFORE UPDATE ON public.escrow_wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();