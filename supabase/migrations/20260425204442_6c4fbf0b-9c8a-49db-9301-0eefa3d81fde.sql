-- 1. Magic invite links table
CREATE TABLE public.magic_invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  deal_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  target_role TEXT NOT NULL CHECK (target_role IN ('buyer','seller')),
  created_by UUID NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_magic_invite_links_deal_id ON public.magic_invite_links(deal_id);
CREATE INDEX idx_magic_invite_links_created_by ON public.magic_invite_links(created_by);
CREATE INDEX idx_magic_invite_links_target_user_id ON public.magic_invite_links(target_user_id);

ALTER TABLE public.magic_invite_links ENABLE ROW LEVEL SECURITY;

-- Admins: full read/write/revoke
CREATE POLICY "Admins can view magic invite links"
  ON public.magic_invite_links FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert magic invite links"
  ON public.magic_invite_links FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND created_by = auth.uid());

CREATE POLICY "Admins can update magic invite links"
  ON public.magic_invite_links FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete magic invite links"
  ON public.magic_invite_links FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Moderators: same powers
CREATE POLICY "Moderators can view magic invite links"
  ON public.magic_invite_links FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can insert magic invite links"
  ON public.magic_invite_links FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'moderator'::app_role) AND created_by = auth.uid());

CREATE POLICY "Moderators can update magic invite links"
  ON public.magic_invite_links FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can delete magic invite links"
  ON public.magic_invite_links FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'::app_role));

-- updated_at trigger
CREATE TRIGGER update_magic_invite_links_updated_at
  BEFORE UPDATE ON public.magic_invite_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();