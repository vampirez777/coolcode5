-- Terms of Service acceptance tracking
CREATE TABLE public.tos_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT,
  username TEXT,
  context TEXT NOT NULL, -- 'signup' | 'deal_create'
  accepted BOOLEAN NOT NULL,
  attempted_without_accept BOOLEAN NOT NULL DEFAULT false,
  tos_version TEXT NOT NULL DEFAULT 'v1',
  user_agent TEXT,
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tos_acc_context ON public.tos_acceptances(context, created_at DESC);
CREATE INDEX idx_tos_acc_user ON public.tos_acceptances(user_id);
CREATE INDEX idx_tos_acc_email ON public.tos_acceptances(email);

ALTER TABLE public.tos_acceptances ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon, for signup attempts before account exists) can insert
CREATE POLICY "Anyone can record tos acceptance"
  ON public.tos_acceptances FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins see everything
CREATE POLICY "Admins view all tos"
  ON public.tos_acceptances FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can see their own
CREATE POLICY "Users view own tos"
  ON public.tos_acceptances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can delete
CREATE POLICY "Admins delete tos"
  ON public.tos_acceptances FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));