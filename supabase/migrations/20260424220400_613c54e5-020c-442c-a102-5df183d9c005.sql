CREATE TABLE public.access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  browser_id TEXT NOT NULL,
  ip_hash TEXT,
  country TEXT,
  user_agent TEXT,
  reason TEXT NOT NULL,
  is_vpn BOOLEAN DEFAULT false,
  is_proxy BOOLEAN DEFAULT false,
  is_tor BOOLEAN DEFAULT false,
  is_datacenter BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_requests_browser_id ON public.access_requests(browser_id);
CREATE INDEX idx_access_requests_status ON public.access_requests(status);
CREATE INDEX idx_access_requests_created_at ON public.access_requests(created_at DESC);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Validate status values
CREATE OR REPLACE FUNCTION public.validate_access_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NULL OR NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid access request status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_access_request_status_trigger
  BEFORE INSERT OR UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_access_request_status();

CREATE TRIGGER update_access_requests_updated_at
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Service role manages writes (Edge Functions)
CREATE POLICY "Service role can insert access requests"
  ON public.access_requests
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read access requests"
  ON public.access_requests
  FOR SELECT
  TO public
  USING (auth.role() = 'service_role');

-- Admins can view + manage all
CREATE POLICY "Admins can view all access requests"
  ON public.access_requests
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update access requests"
  ON public.access_requests
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete access requests"
  ON public.access_requests
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));