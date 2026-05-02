-- Migration: Add theme customization fields to organizations
-- Run this in Supabase SQL Editor

-- Add theme preset column
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS theme_preset TEXT DEFAULT 'default'
CHECK (theme_preset IN ('default', 'blue', 'green', 'purple', 'dark', 'custom'));

-- Add custom color columns
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3B82F6'
CHECK (primary_color ~ '^#[0-9A-F]{6}$');

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#64748B'
CHECK (secondary_color ~ '^#[0-9A-F]{6}$');

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#10B981'
CHECK (accent_color ~ '^#[0-9A-F]{6}$');

-- Add index for theme_preset if needed for queries
CREATE INDEX IF NOT EXISTS organizations_theme_preset_idx
ON public.organizations (theme_preset);