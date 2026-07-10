
-- Add username to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create deal_messages table for chat
CREATE TABLE public.deal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_messages ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is involved in a deal
CREATE OR REPLACE FUNCTION public.is_deal_participant(_user_id UUID, _deal_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deals
    WHERE id = _deal_id
    AND (creator_id = _user_id OR other_user_id = _user_id)
  )
$$;

CREATE POLICY "Users can view messages in their deals"
  ON public.deal_messages FOR SELECT TO authenticated
  USING (public.is_deal_participant(auth.uid(), deal_id));

CREATE POLICY "Users can send messages in their deals"
  ON public.deal_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.is_deal_participant(auth.uid(), deal_id));

-- Allow deal deletion/cancellation
CREATE POLICY "Users can delete their own deals"
  ON public.deals FOR DELETE TO authenticated
  USING (auth.uid() = creator_id);

-- Security definer function to get username by user_id
CREATE OR REPLACE FUNCTION public.get_username(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT username FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Enable realtime for deal messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_messages;

-- Update support tickets to allow updates
CREATE POLICY "Users can update their own tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
