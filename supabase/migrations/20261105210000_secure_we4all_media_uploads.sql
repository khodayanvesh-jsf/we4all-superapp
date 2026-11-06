-- The bucket already exists and remains public-read for published catalogue/portfolio images.
DROP POLICY IF EXISTS "Public Upload we4all-media" ON storage.objects;
CREATE POLICY "Authenticated users upload to own WE4ALL folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'we4all-media'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
DROP POLICY IF EXISTS "Users update own WE4ALL media" ON storage.objects;
CREATE POLICY "Users update own WE4ALL media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'we4all-media'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'we4all-media'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
DROP POLICY IF EXISTS "Users delete own WE4ALL media" ON storage.objects;
CREATE POLICY "Users delete own WE4ALL media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'we4all-media'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
