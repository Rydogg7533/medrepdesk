-- Add per-user theme preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preferences jsonb DEFAULT '{}'::jsonb;

-- Add account-level theme lock (distributorship can lock theme for all users)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS theme_locked boolean DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_theme jsonb DEFAULT '{}'::jsonb;

-- Create storage bucket for custom background images
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-themes', 'user-themes', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can upload to their own folder
CREATE POLICY "Users can upload theme images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-themes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their theme images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-themes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their theme images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-themes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Theme images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-themes');
