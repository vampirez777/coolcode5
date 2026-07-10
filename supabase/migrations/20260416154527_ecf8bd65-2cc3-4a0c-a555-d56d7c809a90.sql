
CREATE TABLE public.escrow_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coin text NOT NULL,
  network text NOT NULL,
  wallet_address text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coin, network)
);

ALTER TABLE public.escrow_wallets ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read wallets (needed to show deposit address)
CREATE POLICY "Authenticated users can view active wallets"
ON public.escrow_wallets FOR SELECT TO authenticated
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert wallets"
ON public.escrow_wallets FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Admins can update wallets"
ON public.escrow_wallets FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete wallets"
ON public.escrow_wallets FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_escrow_wallets_updated_at
BEFORE UPDATE ON public.escrow_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
