
-- Lock down global_security_settings: remove blanket anon/auth read access.
-- Expose only the (key, enabled) pairs the client gate needs via a SECURITY DEFINER RPC.

DROP POLICY IF EXISTS "Anon can read global security settings" ON public.global_security_settings;
DROP POLICY IF EXISTS "Authenticated users can read global security settings" ON public.global_security_settings;

CREATE OR REPLACE FUNCTION public.get_public_security_flags()
RETURNS TABLE(setting_key text, enabled boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT setting_key, enabled FROM public.global_security_settings;
$$;

REVOKE ALL ON FUNCTION public.get_public_security_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_security_flags() TO anon, authenticated;
