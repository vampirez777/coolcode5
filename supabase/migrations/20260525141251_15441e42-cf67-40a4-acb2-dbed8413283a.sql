-- Restrict broad profile reads while preserving required operational access
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Moderators can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deal participants can view each other's profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Deal participants can view each other's profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.deals d
    WHERE (d.creator_id = auth.uid() OR d.other_user_id = auth.uid())
      AND (d.creator_id = profiles.user_id OR d.other_user_id = profiles.user_id)
  )
);

-- Exact username lookup used when adding another user to a deal.
-- This avoids exposing the entire profiles table to every signed-in user.
CREATE OR REPLACE FUNCTION public.find_profile_for_invite(_username text)
RETURNS TABLE(user_id uuid, username text, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.username, p.display_name
  FROM public.profiles p
  WHERE trim(_username) ~ '^[A-Za-z0-9_-]{3,30}$'
    AND lower(p.username) = lower(trim(_username))
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.find_profile_for_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_profile_for_invite(text) TO authenticated;