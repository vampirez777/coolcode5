CREATE TABLE public.security_action_otps (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code_hash TEXT NOT NULL,
  action_key TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_action_otps_user ON public.security_action_otps(user_id, created_at DESC);

ALTER TABLE public.security_action_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all to security_action_otps"
  ON public.security_action_otps
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);