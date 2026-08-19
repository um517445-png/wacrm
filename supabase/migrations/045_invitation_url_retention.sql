-- Migration 045: Add raw_token and invitation_url columns to system_invitations
ALTER TABLE public.system_invitations
ADD COLUMN IF NOT EXISTS raw_token text,
ADD COLUMN IF NOT EXISTS invitation_url text;
