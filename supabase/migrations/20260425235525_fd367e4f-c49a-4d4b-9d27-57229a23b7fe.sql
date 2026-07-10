-- User security preferences table
CREATE TABLE public.user_security_prefs (
  user_id UUID NOT NULL PRIMARY KEY,
  require_2fa_on_release BOOLEAN NOT NULL DEFAULT true,
  require_captcha_on_release BOOLEAN NOT NULL DEFAULT true,
  require_confirm_prompt BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_security_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own security prefs"
  ON public.user_security_prefs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own security prefs"
  ON public.user_security_prefs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own security prefs"
  ON public.user_security_prefs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all security prefs"
  ON public.user_security_prefs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_user_security_prefs_updated_at
  BEFORE UPDATE ON public.user_security_prefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();