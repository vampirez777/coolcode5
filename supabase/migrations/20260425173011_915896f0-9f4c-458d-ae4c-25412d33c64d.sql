-- Helper: moderator OR admin (use everywhere we want both to have access)
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'moderator'::app_role)
  )
$$;

-- PROFILES: moderators can view all profiles (already public-readable, but keep an explicit policy for clarity)
-- (no-op since profiles are already viewable by everyone — skip)

-- DEALS: moderators can view & update all deals
CREATE POLICY "Moderators can view all deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can update all deals"
  ON public.deals FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'::app_role));

-- DEAL MESSAGES: moderators can view all and send
CREATE POLICY "Moderators can view all deal messages"
  ON public.deal_messages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can send messages in any deal"
  ON public.deal_messages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'moderator'::app_role));

-- SUPPORT TICKETS: moderators can view all
CREATE POLICY "Moderators can view all support tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'::app_role));

-- USER ROLES: moderators can read their own only (already covered by "Users can view own role")
-- No additional policy needed.

-- DISPUTES: moderators can view (read-only — admins still resolve)
CREATE POLICY "Moderators can view all disputes"
  ON public.disputes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'::app_role));
