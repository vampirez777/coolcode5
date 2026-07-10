
CREATE OR REPLACE FUNCTION public.post_deal_status_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  msg TEXT;
  poster UUID;
BEGIN
  IF NEW.status IS NULL OR OLD.status IS NULL OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  msg := CASE NEW.status
    WHEN 'deposited' THEN '✅ Deposit verified — funds are now safely secured in escrow.'
    WHEN 'item_delivered' THEN '📦 Buyer confirmed receipt of the item. Releasing funds shortly.'
    WHEN 'completed' THEN '🎉 Funds released to the seller — deal complete!'
    WHEN 'refunded' THEN '↩️ Buyer has been refunded — deal closed.'
    WHEN 'cancelled' THEN '🚫 Deal cancelled.'
    WHEN 'disputed' THEN '⚠️ A dispute has been opened on this deal.'
    ELSE NULL
  END;

  IF msg IS NULL THEN
    RETURN NEW;
  END IF;

  -- Use the deal creator as the message sender so RLS check on deal_messages
  -- (sender must be a deal participant) is satisfied. The message itself is a
  -- system-style update, the sender id is just a technical requirement.
  poster := COALESCE(NEW.creator_id, NEW.other_user_id);
  IF poster IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.deal_messages (deal_id, sender_id, message)
  VALUES (NEW.id, poster, msg);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS post_deal_status_chat_message_trigger ON public.deals;
CREATE TRIGGER post_deal_status_chat_message_trigger
AFTER UPDATE OF status ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.post_deal_status_chat_message();
