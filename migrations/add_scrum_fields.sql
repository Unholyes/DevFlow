-- Migration: Add Scrum-specific fields to tasks table
-- Run this in Supabase SQL Editor

-- Add story_points column for Scrum estimation
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 0;

-- Add position column for ordering within columns/backlog
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Add sprint_burndown_snapshots table for tracking daily burndown data
CREATE TABLE IF NOT EXISTS public.sprint_burndown_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  points_remaining INTEGER NOT NULL,
  points_completed INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on burndown snapshots
ALTER TABLE public.sprint_burndown_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view burndown snapshots for their organization's sprints
CREATE POLICY "Burndown snapshots: select members/owner" ON public.sprint_burndown_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.sprints s
      JOIN public.organizations o ON o.id = s.organization_id
      WHERE s.id = sprint_burndown_snapshots.sprint_id
        AND (o.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = o.id AND om.user_id = auth.uid()
        ))
    )
  );

-- Policy: Users can insert burndown snapshots for their organization's sprints
CREATE POLICY "Burndown snapshots: insert members/owner" ON public.sprint_burndown_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sprints s
      JOIN public.organizations o ON o.id = s.organization_id
      WHERE s.id = sprint_burndown_snapshots.sprint_id
        AND (o.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = o.id AND om.user_id = auth.uid()
        ))
    )
  );

-- Create index for faster burndown queries
CREATE INDEX IF NOT EXISTS idx_sprint_burndown_snapshots_sprint_date 
  ON public.sprint_burndown_snapshots(sprint_id, date);
