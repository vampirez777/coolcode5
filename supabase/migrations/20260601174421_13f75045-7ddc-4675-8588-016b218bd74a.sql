DROP POLICY IF EXISTS "Anon can read global security settings" ON public.global_security_settings;
DROP POLICY IF EXISTS "Authenticated users can read global security settings" ON public.global_security_settings;

CREATE POLICY "Anon can read global security settings"
ON public.global_security_settings
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Authenticated users can read global security settings"
ON public.global_security_settings
FOR SELECT
TO authenticated
USING (true);