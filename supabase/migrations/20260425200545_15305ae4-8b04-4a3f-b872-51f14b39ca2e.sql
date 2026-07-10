-- Add cancellation request column to deals
ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS cancel_requested_by UUID,
  ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMP WITH TIME ZONE;

-- Restrict moderators from cancelling deals (admins still can)
DROP POLICY IF EXISTS "Moderators can update all deals" ON public.deals;
CREATE POLICY "Moderators can update non-cancellation deal fields"
ON public.deals
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (
  has_role(auth.uid(), 'moderator'::app_role)
  AND status <> 'cancelled'
);

-- Auto-clear cancel request when status changes off awaiting/in-progress states
CREATE OR REPLACE FUNCTION public.clear_cancel_request_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('awaiting_deposit','deposit_pending','deposited','in_progress') THEN
    NEW.cancel_requested_by := NULL;
    NEW.cancel_requested_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_cancel_request_trigger ON public.deals;
CREATE TRIGGER clear_cancel_request_trigger
BEFORE UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.clear_cancel_request_on_status_change();

-- Notify the other party when a cancellation is requested
CREATE OR REPLACE FUNCTION public.notify_cancel_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_name TEXT;
  target_uid UUID;
BEGIN
  IF NEW.cancel_requested_by IS NOT NULL 
     AND (OLD.cancel_requested_by IS NULL OR OLD.cancel_requested_by IS DISTINCT FROM NEW.cancel_requested_by) THEN

    IF NEW.cancel_requested_by = NEW.creator_id THEN
      target_uid := NEW.other_user_id;
    ELSE
      target_uid := NEW.creator_id;
    END IF;

    IF target_uid IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(username, display_name, 'The other party')
      INTO requester_name
      FROM public.profiles WHERE user_id = NEW.cancel_requested_by LIMIT 1;

    INSERT INTO public.notifications (user_id, type, title, body, deal_id)
    VALUES (
      target_uid,
      'cancel_request',
      'Cancellation requested',
      COALESCE(requester_name, 'The other party') || ' wants to cancel this ' || COALESCE(NEW.coin, '') || ' deal. Approve or decline.',
      NEW.id
    );

    -- Post a system chat message
    INSERT INTO public.deal_messages (deal_id, sender_id, message)
    VALUES (NEW.id, NEW.cancel_requested_by, '⚠️ ' || COALESCE(requester_name, 'A user') || ' requested to cancel this deal. The other party must approve.');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_cancel_request_trigger ON public.deals;
CREATE TRIGGER notify_cancel_request_trigger
AFTER UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.notify_cancel_request();