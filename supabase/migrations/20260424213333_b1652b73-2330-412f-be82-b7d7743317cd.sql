-- Stores hashed VPN OTP codes (email is hashed, not the plain address)
CREATE TABLE public.vpn_otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_hash TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  ip_hash TEXT,
  attempts INT NOT NULL DEFAULT 0,
  consumed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vpn_otp_email_hash ON public.vpn_otp_codes (email_hash);
CREATE INDEX idx_vpn_otp_expires ON public.vpn_otp_codes (expires_at);

ALTER TABLE public.vpn_otp_codes ENABLE ROW LEVEL SECURITY;
-- No public access; only service role (bypasses RLS).
CREATE POLICY "Deny all to vpn_otp_codes"
  ON public.vpn_otp_codes FOR ALL
  TO authenticated, anon
  USING (false) WITH CHECK (false);

-- Stores proof-of-work challenge seeds
CREATE TABLE public.pow_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge TEXT NOT NULL UNIQUE,
  difficulty INT NOT NULL DEFAULT 18,
  ip_hash TEXT,
  consumed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pow_challenge_lookup ON public.pow_challenges (challenge);
CREATE INDEX idx_pow_expires ON public.pow_challenges (expires_at);

ALTER TABLE public.pow_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all to pow_challenges"
  ON public.pow_challenges FOR ALL
  TO authenticated, anon
  USING (false) WITH CHECK (false);