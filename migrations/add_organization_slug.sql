-- Migration: Add organization slug for subdomain tenancy
-- Run this in Supabase SQL Editor

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill slugs for existing organizations (best-effort).
-- If name-based slug collides, append a short id suffix.
UPDATE public.organizations
SET slug = left(
  regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'),
  48
)
WHERE slug IS NULL;

-- Resolve any duplicates by suffixing with id prefix
WITH dups AS (
  SELECT slug
  FROM public.organizations
  WHERE slug IS NOT NULL
  GROUP BY slug
  HAVING COUNT(*) > 1
)
UPDATE public.organizations o
SET slug = left(o.slug || '-' || substring(replace(o.id::text, '-', '') from 1 for 6), 48)
FROM dups
WHERE o.slug = dups.slug;

-- Ensure slug is present
UPDATE public.organizations
SET slug = 'org-' || substring(replace(id::text, '-', '') from 1 for 12)
WHERE slug IS NULL OR slug = '';

-- Enforce uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_unique_idx
ON public.organizations (slug);

ALTER TABLE public.organizations
ALTER COLUMN slug SET NOT NULL;

