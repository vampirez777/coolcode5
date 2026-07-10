-- Feature flags: admin-controlled toggles to disable features for users
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  label text NOT NULL,
  description text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can read flags so the UI can react
CREATE POLICY "Anyone can read feature flags"
  ON public.feature_flags
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ONLY admins can change flags. Moderators have no access.
CREATE POLICY "Admins can insert feature flags"
  ON public.feature_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update feature flags"
  ON public.feature_flags
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete feature flags"
  ON public.feature_flags
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the initial set of toggleable features
INSERT INTO public.feature_flags (flag_key, enabled, label, description) VALUES
  ('create_deals', true, 'Create new deals', 'Allow users to start a new escrow deal.'),
  ('deal_attachments', true, 'Deal chat attachments', 'Allow users to upload files inside deal chats.'),
  ('support_tickets', true, 'Open support tickets', 'Allow users to open new support tickets.'),
  ('dispute_creation', true, 'Open disputes', 'Allow users to raise disputes on a deal.'),
  ('signups', true, 'New user signups', 'Allow brand-new accounts to be created.'),
  ('magic_invite_claim', true, 'Magic invite claim', 'Allow incoming users to claim magic invite links.');