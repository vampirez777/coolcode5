CREATE OR REPLACE FUNCTION public.is_username_available(_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN trim(_username) !~ '^[A-Za-z0-9_-]{3,30}$' THEN false
    ELSE NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE lower(p.username) = lower(trim(_username))
    )
  END
$$;

REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;