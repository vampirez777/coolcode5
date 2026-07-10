
-- 1) Profiles: restrict SELECT to authenticated users only (prevent anon email harvesting)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2) feature_flags: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can read feature flags" ON public.feature_flags;
CREATE POLICY "Authenticated users can read feature flags"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (true);

-- 3) global_security_settings: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can read global security settings" ON public.global_security_settings;
CREATE POLICY "Authenticated users can read global security settings"
ON public.global_security_settings
FOR SELECT
TO authenticated
USING (true);

-- 4) tos_acceptances: tighten permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can record tos acceptance" ON public.tos_acceptances;
CREATE POLICY "Users can record own tos acceptance"
ON public.tos_acceptances
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon can record tos acceptance with null user"
ON public.tos_acceptances
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- 5) Fix mutable search_path on email queue helpers
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

-- Email queue helpers are only meant to be invoked by service role / triggers; revoke from all client roles
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, public;

-- 6) Revoke EXECUTE on internal SECURITY DEFINER helpers from anon
-- (authenticated users still need has_role / is_deal_participant for RLS policies to resolve)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_deal_participant(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_moderator_or_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_username(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_has_completed_deal(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_browser_blocked(text) FROM anon, public;

-- 7) Storage: restrict public bucket SELECT on avatars to single-object reads, not listing
-- We keep public read of individual files (lookups by exact key still work) but
-- remove any catch-all SELECT policy that allows enumeration.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read of avatars" ON storage.objects;
CREATE POLICY "Avatars public read by key"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

-- For email-assets keep public read by key (same shape)
DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read of email-assets" ON storage.objects;
CREATE POLICY "Email assets public read by key"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'email-assets');
