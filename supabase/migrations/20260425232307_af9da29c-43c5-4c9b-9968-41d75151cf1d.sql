-- =========================================
-- Giveaways feature + role-escalation guard
-- =========================================

-- 1) Giveaways table
CREATE TABLE public.giveaways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  prize text NOT NULL,
  image_url text,
  winners_count integer NOT NULL DEFAULT 1,
  entry_requirements text,
  winner_notes text,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.giveaways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view giveaways"
  ON public.giveaways FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert giveaways"
  ON public.giveaways FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND created_by = auth.uid());

CREATE POLICY "Admins can update giveaways"
  ON public.giveaways FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete giveaways"
  ON public.giveaways FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_giveaways_updated_at
  BEFORE UPDATE ON public.giveaways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Giveaway entries table
CREATE TABLE public.giveaway_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  giveaway_id uuid NOT NULL REFERENCES public.giveaways(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  eligibility_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (giveaway_id, user_id)
);

ALTER TABLE public.giveaway_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own entries"
  ON public.giveaway_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all entries"
  ON public.giveaway_entries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own entry"
  ON public.giveaway_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins delete entries"
  ON public.giveaway_entries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Eligibility helper: completed-deal participant
CREATE OR REPLACE FUNCTION public.user_has_completed_deal(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deals
    WHERE status = 'completed'
      AND (creator_id = _user_id OR other_user_id = _user_id)
  )
$$;

-- 4) Hard safeguard: only admins may insert/update/delete user_roles rows
-- (Moderators can no longer grant themselves admin even via direct table writes.)
-- Existing policies already enforce this at the RLS layer, but we add a
-- trigger as a defense-in-depth measure that runs even if RLS is bypassed
-- by a misconfigured client (it does not block service_role, which has
-- BYPASSRLS but still goes through triggers — we explicitly allow it).
CREATE OR REPLACE FUNCTION public.guard_user_roles_writes()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_role text := auth.role();
BEGIN
  -- Service role (edge functions using SERVICE_ROLE_KEY) is allowed.
  IF caller_role = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Block any non-admin authenticated caller.
  IF caller IS NULL OR NOT public.has_role(caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can modify user_roles';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER guard_user_roles_writes_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_roles_writes();