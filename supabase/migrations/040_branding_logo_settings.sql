-- Migration 040: Add branding logo and title settings to accounts & storage
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS branding_name TEXT DEFAULT 'Vorder';

-- Ensure branding storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding', 
  'branding', 
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policy for branding bucket
CREATE POLICY "Public Read Access for Branding Assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

CREATE POLICY "Authenticated Upload for Branding Assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'branding');

CREATE POLICY "Authenticated Delete for Branding Assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'branding');
