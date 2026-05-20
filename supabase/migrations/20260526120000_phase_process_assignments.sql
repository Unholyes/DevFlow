-- Migration: Add Phase and Process Assignments
-- Adds assigned_team_id and assigned_user_id columns to sdlc_phases and phase_processes.

BEGIN;

-- 1. Add columns to public.sdlc_phases
ALTER TABLE public.sdlc_phases
  ADD COLUMN IF NOT EXISTS assigned_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Add columns to public.phase_processes
ALTER TABLE public.phase_processes
  ADD COLUMN IF NOT EXISTS assigned_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMIT;
