
-- Restrict global_security_settings reads to admins and moderators only
DROP POLICY IF EXISTS "Authenticated users can read global security settings" ON public.global_security_settings;

CREATE POLICY "Admins can read global security settings"
ON public.global_security_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can read global security settings"
ON public.global_security_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'::app_role));

-- Remove user self-insert for notifications; only admins / triggers / service role insert them now
DROP POLICY IF EXISTS "Users can receive notifications" ON public.notifications;

-- Remove global_security_settings from realtime broadcast so security toggles aren't pushed to all clients
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'global_security_settings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.global_security_settings';
  END IF;
END $$;
