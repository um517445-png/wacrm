-- Migration 035: Create system_settings table for global platform toggles
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access so authentication pages can query registration status
DROP POLICY IF EXISTS "Allow public read system_settings" ON public.system_settings;
CREATE POLICY "Allow public read system_settings"
    ON public.system_settings FOR SELECT
    USING (true);

-- Insert default allow_public_signup setting if not exists
INSERT INTO public.system_settings (key, value)
VALUES ('allow_public_signup', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
