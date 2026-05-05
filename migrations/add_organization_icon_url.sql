-- Migration: Add organization logo URL
-- Run this in Supabase SQL Editor (or via `supabase db reset` locally).

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS icon_url TEXT;

