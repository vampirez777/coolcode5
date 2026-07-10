ALTER TABLE public.user_security_prefs
  ADD COLUMN IF NOT EXISTS personal_2fa_threshold_usd numeric;

-- Optional sanity bound (no time-dependence, safe as CHECK)
ALTER TABLE public.user_security_prefs
  DROP CONSTRAINT IF EXISTS user_security_prefs_threshold_range;
ALTER TABLE public.user_security_prefs
  ADD CONSTRAINT user_security_prefs_threshold_range
  CHECK (personal_2fa_threshold_usd IS NULL OR (personal_2fa_threshold_usd >= 0 AND personal_2fa_threshold_usd <= 10000000));