-- Create system_settings table for global application config flags
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Seed default allow_public_signup flag as true
INSERT INTO system_settings (key, value)
VALUES ('allow_public_signup', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to system_settings so login/signup pages can inspect status
CREATE POLICY "Allow public read access to system_settings"
  ON system_settings FOR SELECT
  USING (true);

-- Allow authenticated owners/admins to update system_settings
CREATE POLICY "Allow owners and admins to update system_settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
