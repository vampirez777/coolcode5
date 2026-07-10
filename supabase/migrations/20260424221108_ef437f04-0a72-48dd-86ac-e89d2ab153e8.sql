ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS ip_address TEXT;
CREATE INDEX IF NOT EXISTS idx_access_requests_ip_address ON public.access_requests(ip_address);