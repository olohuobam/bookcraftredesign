-- Drop the broad anon-SELECT policy on storage.objects for the
-- picturebook-images bucket. Public buckets serve files via direct URL
-- without needing a SELECT policy on storage.objects; this policy
-- allowed clients to LIST the bucket, exposing more than intended.
-- Authenticated users still have a scoped "own folder" SELECT policy.

DROP POLICY IF EXISTS "Anyone can read with signed URL" ON storage.objects;
