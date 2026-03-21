-- ============================================================
-- JungleGym – Allow storage reads for free, published videos
-- ============================================================
-- The videos bucket is private. The existing RLS only grants read
-- access to the creator (by UID folder prefix) or to buyers (via
-- purchases join). Free videos have no purchase row, so
-- createSignedUrl() fails for learners even though is_free=true.
-- This policy fixes that gap.

CREATE POLICY "videos: free published read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'videos'
    AND EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.video_url LIKE '%' || name || '%'
        AND v.is_free = true
        AND v.published = true
    )
  );
