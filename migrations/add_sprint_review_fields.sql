-- Migration: Add sprint review fields (summary + retrospective)
-- Run this in Supabase SQL Editor

ALTER TABLE public.sprints
ADD COLUMN IF NOT EXISTS summary JSONB;

ALTER TABLE public.sprints
ADD COLUMN IF NOT EXISTS retrospective JSONB;

ALTER TABLE public.sprints
ADD COLUMN IF NOT EXISTS unfinished_action TEXT;

-- Helpful indexes for querying closed sprints with reviews
CREATE INDEX IF NOT EXISTS idx_sprints_status ON public.sprints(status);
