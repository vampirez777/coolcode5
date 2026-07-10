-- Live admin broadcast announcements (popup notifications shown to live visitors)
CREATE TABLE public.live_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  body text,
  variant text NOT NULL DEFAULT 'info', -- info | success | warning | critical
  cta_label text,
  cta_url text,
  duration_ms integer NOT NULL DEFAULT 8000,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_announcements ENABLE ROW LEVEL SECURITY;

-- Only admins can create
CREATE POLICY "Admins can insert live announcements"
ON public.live_announcements FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND created_by = auth.uid());

-- Only admins can delete (cancel) / view full history
CREATE POLICY "Admins can delete live announcements"
ON public.live_announcements FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all live announcements"
ON public.live_announcements FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read currently active announcements (so they can fetch on mount)
CREATE POLICY "Anyone can view active live announcements"
ON public.live_announcements FOR SELECT TO anon, authenticated
USING (expires_at > now());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_announcements;
ALTER TABLE public.live_announcements REPLICA IDENTITY FULL;

CREATE INDEX idx_live_announcements_expires ON public.live_announcements(expires_at DESC);
