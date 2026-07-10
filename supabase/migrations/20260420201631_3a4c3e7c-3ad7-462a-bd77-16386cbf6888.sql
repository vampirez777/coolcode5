-- Maintenance mode settings table
CREATE TABLE public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  maintenance_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO public.app_settings (id, maintenance_mode) VALUES (1, false);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone (even unauthenticated) can read maintenance status
CREATE POLICY "Anyone can read app settings"
ON public.app_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can update app settings"
ON public.app_settings FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime so toggle propagates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;