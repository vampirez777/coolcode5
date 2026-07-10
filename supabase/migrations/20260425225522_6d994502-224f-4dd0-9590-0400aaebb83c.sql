-- Gate blocks table: persists "Please try again later" decisions per browser id.
-- A row here means the browser is blocked from completing the entry flow until
-- an admin removes the row from the Admin → Security tab.
CREATE TABLE public.gate_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  browser_id TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL DEFAULT 'risk_score',
  risk_score INTEGER NOT NULL DEFAULT 0,
  user_agent TEXT,
  ip_hash TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_gate_blocks_browser_id ON public.gate_blocks(browser_id);
CREATE INDEX idx_gate_blocks_created_at ON public.gate_blocks(created_at DESC);

ALTER TABLE public.gate_blocks ENABLE ROW LEVEL SECURITY;

-- Admins: full management
CREATE POLICY "Admins can view gate blocks"
ON public.gate_blocks FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert gate blocks"
ON public.gate_blocks FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update gate blocks"
ON public.gate_blocks FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete gate blocks"
ON public.gate_blocks FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role: insert/upsert blocks from edge functions
CREATE POLICY "Service role can manage gate blocks"
ON public.gate_blocks FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Updated-at trigger
CREATE TRIGGER update_gate_blocks_updated_at
BEFORE UPDATE ON public.gate_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Anonymous-safe lookup: a SECURITY DEFINER function returns a single boolean
-- so a visitor's browser id can be checked at page load without exposing the
-- full table or its admin metadata.
CREATE OR REPLACE FUNCTION public.is_browser_blocked(_browser_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gate_blocks WHERE browser_id = _browser_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_browser_blocked(TEXT) TO anon, authenticated;