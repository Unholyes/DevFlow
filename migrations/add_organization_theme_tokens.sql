-- Migration: Add richer theme tokens to organizations
-- Run this in Supabase SQL Editor (or via local migrations).

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS background_color TEXT,
ADD COLUMN IF NOT EXISTS surface_color TEXT,
ADD COLUMN IF NOT EXISTS sidebar_color TEXT,
ADD COLUMN IF NOT EXISTS border_color TEXT,
ADD COLUMN IF NOT EXISTS text_color TEXT,
ADD COLUMN IF NOT EXISTS muted_text_color TEXT;

