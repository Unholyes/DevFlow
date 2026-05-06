-- Phase 1: Teams as real entities (org-scoped)
-- Adds public.teams + public.team_members with RLS aligned to organization_members.system_role

BEGIN;

-- =========================================================
-- Teams
-- =========================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Uniqueness: team name within an organization (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS teams_org_name_unique_idx
  ON public.teams (organization_id, lower(name));

CREATE INDEX IF NOT EXISTS teams_org_idx
  ON public.teams (organization_id);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Read: any org member can view teams
DROP POLICY IF EXISTS "Org members can view teams" ON public.teams;
CREATE POLICY "Org members can view teams"
  ON public.teams
  FOR SELECT
  USING (private.is_org_member(organization_id));

-- Write: org Owner/Admin can manage teams
DROP POLICY IF EXISTS "Org admins can create teams" ON public.teams;
CREATE POLICY "Org admins can create teams"
  ON public.teams
  FOR INSERT
  WITH CHECK (private.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Org admins can update teams" ON public.teams;
CREATE POLICY "Org admins can update teams"
  ON public.teams
  FOR UPDATE
  USING (private.is_org_admin(organization_id))
  WITH CHECK (private.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Org admins can delete teams" ON public.teams;
CREATE POLICY "Org admins can delete teams"
  ON public.teams
  FOR DELETE
  USING (private.is_org_admin(organization_id));

-- =========================================================
-- Team members
-- =========================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id),
  CONSTRAINT team_members_role_check CHECK (team_role IN ('lead', 'member'))
);

CREATE INDEX IF NOT EXISTS team_members_user_idx
  ON public.team_members (user_id);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Read: any org member can view team membership for teams in their org
DROP POLICY IF EXISTS "Org members can view team members" ON public.team_members;
CREATE POLICY "Org members can view team members"
  ON public.team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND private.is_org_member(t.organization_id)
    )
  );

-- Insert/Delete/Update: org Owner/Admin only (derived via team -> org)
DROP POLICY IF EXISTS "Org admins can add team members" ON public.team_members;
CREATE POLICY "Org admins can add team members"
  ON public.team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND private.is_org_admin(t.organization_id)
    )
  );

DROP POLICY IF EXISTS "Org admins can update team members" ON public.team_members;
CREATE POLICY "Org admins can update team members"
  ON public.team_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND private.is_org_admin(t.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND private.is_org_admin(t.organization_id)
    )
  );

DROP POLICY IF EXISTS "Org admins can remove team members" ON public.team_members;
CREATE POLICY "Org admins can remove team members"
  ON public.team_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND private.is_org_admin(t.organization_id)
    )
  );

COMMIT;

