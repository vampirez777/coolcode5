-- Moderators can view all support messages
CREATE POLICY "Moderators can view all support messages"
ON public.support_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'::app_role));

-- Moderators can send messages on any support ticket
CREATE POLICY "Moderators can send support messages"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Moderators can update support tickets (e.g., change status)
CREATE POLICY "Moderators can update all support tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'::app_role));