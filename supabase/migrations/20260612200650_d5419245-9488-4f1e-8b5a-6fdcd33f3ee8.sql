
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS deal_category text,
  ADD COLUMN IF NOT EXISTS deal_description text,
  ADD COLUMN IF NOT EXISTS deal_details_confirmed_by_creator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deal_details_confirmed_by_other boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deal_details_editing_by uuid;
