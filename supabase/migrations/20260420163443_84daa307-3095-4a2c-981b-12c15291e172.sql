-- Add attachment columns to deal_messages
ALTER TABLE public.deal_messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Allow empty message text when an attachment is present (drop NOT NULL if it exists)
ALTER TABLE public.deal_messages ALTER COLUMN message DROP NOT NULL;

-- Create private storage bucket for deal chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-attachments', 'deal-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: files are organized as {deal_id}/{user_id}/{filename}
CREATE POLICY "Deal participants can view attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-attachments'
  AND (
    public.is_deal_participant(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Deal participants can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deal-attachments'
  AND public.is_deal_participant(auth.uid(), ((storage.foldername(name))[1])::uuid)
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'deal-attachments'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Admins can delete any attachment"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'deal-attachments'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);