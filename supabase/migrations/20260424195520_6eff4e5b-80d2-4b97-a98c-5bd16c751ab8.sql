
-- Security events log: captcha pass/fail and VPN-detection results
CREATE TABLE public.security_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL, -- 'captcha_success' | 'captcha_failure' | 'vpn_check'
  success boolean,
  ip_hash text,             -- hashed, never raw IP
  country text,
  is_vpn boolean,
  is_proxy boolean,
  is_tor boolean,
  is_datacenter boolean,
  user_agent text,
  error_codes text[],
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_events_created_at ON public.security_events (created_at DESC);
CREATE INDEX idx_security_events_type ON public.security_events (event_type, created_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read
CREATE POLICY "Admins can view security events"
ON public.security_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only the service role (edge functions) inserts. No anon/authenticated insert policy.
CREATE POLICY "Service role can insert security events"
ON public.security_events
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');
