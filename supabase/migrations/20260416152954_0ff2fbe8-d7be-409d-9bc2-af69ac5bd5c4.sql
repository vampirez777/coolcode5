
CREATE POLICY "Admins can view all deal messages"
ON public.deal_messages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can send messages in any deal"
ON public.deal_messages
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
