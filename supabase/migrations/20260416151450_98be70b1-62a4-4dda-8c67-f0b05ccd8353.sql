
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Trigger: notify user when they are added to a deal
CREATE OR REPLACE FUNCTION public.notify_deal_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_name TEXT;
BEGIN
  IF NEW.other_user_id IS NOT NULL AND (OLD.other_user_id IS NULL OR OLD.other_user_id != NEW.other_user_id) THEN
    SELECT COALESCE(username, display_name, 'Someone') INTO creator_name
    FROM public.profiles WHERE user_id = NEW.creator_id LIMIT 1;

    INSERT INTO public.notifications (user_id, type, title, body, deal_id)
    VALUES (
      NEW.other_user_id,
      'deal_invite',
      'New Deal Invitation',
      creator_name || ' invited you to a ' || COALESCE(NEW.coin, '') || ' deal',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_deal_user_added
  AFTER UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_deal_invitation();

-- Trigger: notify other party on new chat message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
  other_uid UUID;
  deal_record RECORD;
BEGIN
  SELECT * INTO deal_record FROM public.deals WHERE id = NEW.deal_id;
  IF deal_record IS NULL THEN RETURN NEW; END IF;

  IF NEW.sender_id = deal_record.creator_id THEN
    other_uid := deal_record.other_user_id;
  ELSE
    other_uid := deal_record.creator_id;
  END IF;

  IF other_uid IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(username, display_name, 'Someone') INTO sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;

  INSERT INTO public.notifications (user_id, type, title, body, deal_id)
  VALUES (
    other_uid,
    'new_message',
    'New Message',
    sender_name || ': ' || LEFT(NEW.message, 80),
    NEW.deal_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_deal_message
  AFTER INSERT ON public.deal_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
