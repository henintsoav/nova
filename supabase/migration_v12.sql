-- migration_v12: profile customization
-- accent_color, banner_url, availability_status

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accent_color        TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS banner_url          TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS availability_status TEXT    DEFAULT 'available';

-- Storage bucket for profile banners (run once)
-- Create via Supabase dashboard: Storage → New bucket → "banners" → Public
-- Then add these policies:

-- Allow authenticated users to upload their own banner
-- Policy name: banners_upload_own
-- INSERT: (bucket_id = 'banners') AND (auth.uid()::text = (storage.foldername(name))[1])

-- Allow public read
-- Policy name: banners_read_public
-- SELECT: bucket_id = 'banners'

-- Allow authenticated users to update their own banner
-- Policy name: banners_update_own
-- UPDATE: (bucket_id = 'banners') AND (auth.uid()::text = (storage.foldername(name))[1])
