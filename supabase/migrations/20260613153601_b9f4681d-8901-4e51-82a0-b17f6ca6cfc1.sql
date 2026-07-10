
-- Preset stat columns on magic_invite_links.
ALTER TABLE public.magic_invite_links
  ADD COLUMN IF NOT EXISTS preset_total_deals integer,
  ADD COLUMN IF NOT EXISTS preset_total_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS preset_avg_deal_seconds integer;

-- Same preset columns on profiles. Nullable => "no override, use real stats".
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preset_total_deals integer,
  ADD COLUMN IF NOT EXISTS preset_total_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS preset_avg_deal_seconds integer;

-- Staff-only policies on magic_invite_links: own rows only.
DROP POLICY IF EXISTS "Staff can insert their own magic invite links" ON public.magic_invite_links;
CREATE POLICY "Staff can insert their own magic invite links"
  ON public.magic_invite_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'staff'::app_role)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Staff can view their own magic invite links" ON public.magic_invite_links;
CREATE POLICY "Staff can view their own magic invite links"
  ON public.magic_invite_links
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'staff'::app_role)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Staff can update their own magic invite links" ON public.magic_invite_links;
CREATE POLICY "Staff can update their own magic invite links"
  ON public.magic_invite_links
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'staff'::app_role)
    AND created_by = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'staff'::app_role)
    AND created_by = auth.uid()
  );
