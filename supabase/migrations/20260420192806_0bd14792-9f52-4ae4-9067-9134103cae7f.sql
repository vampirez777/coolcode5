
-- 1) Backfill existing profiles that have no username
UPDATE public.profiles
SET username = 'user_' || substr(replace(user_id::text, '-', ''), 1, 8)
WHERE username IS NULL OR username = '';

-- 2) Enforce uniqueness (case-insensitive) at the database layer
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
  ON public.profiles (LOWER(username));

-- 3) Enforce NOT NULL on username going forward
ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;

-- 4) Update handle_new_user so it always populates username
--    (uses raw_user_meta_data->>'username' if provided at signup, else falls back to user_xxxxxxxx)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  desired_username TEXT;
  final_username TEXT;
  attempt INT := 0;
BEGIN
  desired_username := LOWER(NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''));

  IF desired_username IS NULL THEN
    desired_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;

  final_username := desired_username;

  -- Ensure uniqueness (case-insensitive). If taken, append a numeric suffix.
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(final_username)) LOOP
    attempt := attempt + 1;
    final_username := desired_username || attempt::text;
    IF attempt > 50 THEN
      final_username := desired_username || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''), final_username)
  );
  RETURN NEW;
END;
$function$;
