
CREATE TABLE public.disputes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Users can create disputes on their own deals
CREATE POLICY "Users can create disputes on their deals"
ON public.disputes FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = raised_by
  AND (
    EXISTS (
      SELECT 1 FROM public.deals
      WHERE deals.id = deal_id
      AND (deals.creator_id = auth.uid() OR deals.other_user_id = auth.uid())
    )
  )
);

-- Users can view disputes they raised
CREATE POLICY "Users can view own disputes"
ON public.disputes FOR SELECT TO authenticated
USING (auth.uid() = raised_by);

-- Admins can view all disputes
CREATE POLICY "Admins can view all disputes"
ON public.disputes FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all disputes
CREATE POLICY "Admins can update all disputes"
ON public.disputes FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update trigger
CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Also update deal status to 'disputed' when a dispute is raised
CREATE OR REPLACE FUNCTION public.handle_dispute_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.deals SET status = 'disputed' WHERE id = NEW.deal_id;
  
  -- Notify admin about new dispute
  INSERT INTO public.notifications (user_id, type, title, body, deal_id)
  SELECT ur.user_id, 'dispute', 'New Dispute Raised',
    'A dispute has been raised on a deal. Please review.',
    NEW.deal_id
  FROM public.user_roles ur WHERE ur.role = 'admin';
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_dispute_created
AFTER INSERT ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.handle_dispute_created();
