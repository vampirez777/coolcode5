
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS escrow_wallet_address text,
ADD COLUMN IF NOT EXISTS deposit_confirmed_at timestamptz,
ADD COLUMN IF NOT EXISTS item_delivered_at timestamptz,
ADD COLUMN IF NOT EXISTS funds_released_at timestamptz;
