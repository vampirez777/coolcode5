-- Global security settings (admin-only writable, world-readable)
CREATE TABLE IF NOT EXISTS public.global_security_settings (
  setting_key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_security_settings ENABLE ROW LEVEL SECURITY;

-- Public read so the gates/UI can react instantly without auth
CREATE POLICY "Anyone can read global security settings"
ON public.global_security_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Admins only for writes (NOT moderators)
CREATE POLICY "Admins can insert global security settings"
ON public.global_security_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update global security settings"
ON public.global_security_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete global security settings"
ON public.global_security_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_global_security_settings_updated
BEFORE UPDATE ON public.global_security_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_security_settings;

-- Seed defaults (all enabled)
INSERT INTO public.global_security_settings (setting_key, enabled, label, description, category) VALUES
  ('entry_captcha', TRUE, 'Entry captcha', 'Show hCaptcha challenge to new visitors before they can enter the site.', 'entry'),
  ('entry_vpn_check', TRUE, 'VPN / Tor extra steps', 'Run VPN, proxy and Tor detection and require additional steps for risky networks.', 'entry'),
  ('entry_quiz', TRUE, 'No-invite quiz & manual review', 'Force visitors without a deal invite link through quiz, math and manual approval.', 'entry'),
  ('entry_risk_blocking', TRUE, 'Auto-block risky browsers', 'Automatically block browsers that fail the risk score during the entry flow.', 'entry'),
  ('signup_tos_required', TRUE, 'Require ToS at signup', 'Force users to tick the Terms of Service checkbox before they can register.', 'auth'),
  ('deal_create_tos_required', TRUE, 'Require ToS popup on deal create', 'Show the Terms of Service confirmation popup before creating any new deal.', 'deals'),
  ('user_security_prefs_enforced', TRUE, 'Per-user security actions', 'Honour each user''s personal toggles (2FA on release, captcha on release, "are you sure" prompt). Turn this off to skip them globally.', 'release')
ON CONFLICT (setting_key) DO NOTHING;