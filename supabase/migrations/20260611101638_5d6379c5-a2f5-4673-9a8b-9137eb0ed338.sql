DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;

CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'deal-attachments'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.is_deal_participant(auth.uid(), ((storage.foldername(name))[1])::uuid)
);