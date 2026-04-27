-- Migration: Add phase gating configuration (hybrid governance)
-- Run this in Supabase SQL Editor

-- Project-level gating toggle (Waterfall-style governance at project level)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS phase_gating_enabled BOOLEAN NOT NULL DEFAULT false;

-- Per-phase override: whether the phase is gated (used when project gating is enabled)
ALTER TABLE public.sdlc_phases
ADD COLUMN IF NOT EXISTS is_gated BOOLEAN NOT NULL DEFAULT true;

