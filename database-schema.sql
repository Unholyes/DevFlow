-- DevFlow Multi-Tenant Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Needed for gen_random_uuid() / gen_random_bytes()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================
-- PROFILES TABLE (extends auth.users)
-- =========================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'team_member' CHECK (role IN ('super_admin', 'tenant_admin', 'team_member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- =========================================
-- ORGANIZATIONS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  -- Used for multi-tenant subdomain routing: {slug}.devflow.com
  slug TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_unique_idx
ON public.organizations (slug);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Only authenticated users can create organizations" ON public.organizations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Organization owners can update their organizations" ON public.organizations
  FOR UPDATE USING (auth.uid() = owner_id);

-- =========================================
-- PRIVATE HELPERS (SECURITY DEFINER)
-- =========================================

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION private.is_org_owner(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = p_org_id
      AND o.owner_id = auth.uid()
  );
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_org_owner(uuid) TO authenticated;

-- =========================================
-- ORGANIZATION MEMBERS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Organizations policy depends on organization_members existing,
-- so create it only after the table is defined.
CREATE POLICY "Users can view organizations they belong to" ON public.organizations
  FOR SELECT USING (
    auth.uid() = owner_id
    OR private.is_org_member(id)
  );

-- Organization members policies
CREATE POLICY "Users can view members of organizations they belong to" ON public.organization_members
  FOR SELECT USING (
    private.is_org_owner(organization_id)
    OR private.is_org_member(organization_id)
  );

CREATE POLICY "Organization admins can insert members" ON public.organization_members
  FOR INSERT WITH CHECK (
    private.is_org_owner(organization_id)
    OR private.is_org_admin(organization_id)
  );

CREATE POLICY "Organization admins can update members" ON public.organization_members
  FOR UPDATE USING (
    private.is_org_owner(organization_id)
    OR private.is_org_admin(organization_id)
  );

CREATE POLICY "Organization admins can delete members" ON public.organization_members
  FOR DELETE USING (
    private.is_org_owner(organization_id)
    OR private.is_org_admin(organization_id)
  );

-- =========================================
-- ORGANIZATION APPLICATIONS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS public.organization_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  description TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  phone_number TEXT,
  website_url TEXT,
  industry TEXT,
  expected_team_size TEXT,
  use_case TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'revision_requested')),
  revision_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.organization_applications ENABLE ROW LEVEL SECURITY;

-- Organization applications policies
CREATE POLICY "Users can view their own applications" ON public.organization_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all applications" ON public.organization_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can create their own applications" ON public.organization_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can update applications" ON public.organization_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete applications" ON public.organization_applications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =========================================
-- TEAM INVITATIONS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Team invitations policies
CREATE POLICY "Organization members can view invitations" ON public.team_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = team_invitations.organization_id
      AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = team_invitations.organization_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can create invitations" ON public.team_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = team_invitations.organization_id
      AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = team_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY "Organization admins can update invitations" ON public.team_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = team_invitations.organization_id
      AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = team_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- =========================================
-- TRIGGER FUNCTION FOR NEW USER SIGNUP
-- =========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'team_member')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- UTILITY FUNCTIONS
-- =========================================

-- Function to generate secure invitation tokens
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION public.accept_team_invitation(invitation_token TEXT, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  invitation_record RECORD;
  result JSON;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM public.team_invitations
  WHERE token = invitation_token AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired invitation');
  END IF;

  -- Update invitation status
  UPDATE public.team_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = invitation_record.id;

  -- Add user to organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (invitation_record.organization_id, p_user_id, 'member')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN json_build_object('success', true, 'organization_id', invitation_record.organization_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- DEVFLOW SDLC / PROJECT / TASK SCHEMA
-- =========================================

-- NOTE: This file is intended to be run in Supabase SQL Editor.
-- It extends the existing tenant/auth schema with SDLC workflow entities.

-- -----------------------------------------
-- ENUMS
-- -----------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'task_priority'
  ) THEN
    CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'sdlc_methodology_enum'
  ) THEN
    CREATE TYPE public.sdlc_methodology_enum AS ENUM ('scrum', 'kanban', 'waterfall', 'devops');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'project_status_enum'
  ) THEN
    CREATE TYPE public.project_status_enum AS ENUM ('active', 'archived');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'phase_status_enum'
  ) THEN
    CREATE TYPE public.phase_status_enum AS ENUM ('active', 'completed', 'archived');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'sprint_status_enum'
  ) THEN
    CREATE TYPE public.sprint_status_enum AS ENUM ('planned', 'active', 'closed');
  END IF;
END $$;

-- -----------------------------------------
-- GENERIC UPDATED_AT TRIGGER
-- -----------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------
-- PROJECTS
-- -----------------------------------------

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status public.project_status_enum NOT NULL DEFAULT 'active',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  -- Waterfall-style governance toggle: if enabled, phases can be locked sequentially
  phase_gating_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Projects: select members/owner" ON public.projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = projects.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = projects.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Projects: insert members/owner" ON public.projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = projects.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = projects.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Projects: update members/owner" ON public.projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = projects.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = projects.organization_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = projects.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = projects.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Projects: delete members/owner" ON public.projects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = projects.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = projects.organization_id
        AND om.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_projects_set_updated_at ON public.projects;
CREATE TRIGGER trg_projects_set_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------
-- PROJECT MEMBERS (RBAC inside project)
-- -----------------------------------------

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'developer' CHECK (role IN ('tenant_admin', 'developer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members: select members/owner" ON public.project_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = project_members.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = project_members.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members: insert members/owner" ON public.project_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = project_members.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = project_members.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members: update members/owner" ON public.project_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = project_members.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = project_members.organization_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = project_members.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = project_members.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members: delete members/owner" ON public.project_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = project_members.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = project_members.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- -----------------------------------------
-- SDLC PHASES (hybrid methodologies inside one project)
-- -----------------------------------------

CREATE TABLE IF NOT EXISTS public.sdlc_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  methodology public.sdlc_methodology_enum NOT NULL,
  -- Per-phase override for governance locking
  is_gated BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  status public.phase_status_enum NOT NULL DEFAULT 'active',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, order_index)
);

ALTER TABLE public.sdlc_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SDLC phases: select members/owner" ON public.sdlc_phases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = sdlc_phases.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = sdlc_phases.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "SDLC phases: insert members/owner" ON public.sdlc_phases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = sdlc_phases.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = sdlc_phases.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "SDLC phases: update members/owner" ON public.sdlc_phases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = sdlc_phases.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = sdlc_phases.organization_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = sdlc_phases.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = sdlc_phases.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "SDLC phases: delete members/owner" ON public.sdlc_phases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = sdlc_phases.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = sdlc_phases.organization_id
        AND om.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_sdlc_phases_set_updated_at ON public.sdlc_phases;
CREATE TRIGGER trg_sdlc_phases_set_updated_at
BEFORE UPDATE ON public.sdlc_phases
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------
-- WORKFLOW STAGES (task columns / scrum states)
-- -----------------------------------------

CREATE TABLE IF NOT EXISTS public.workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES public.sdlc_phases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  -- For Scrum: mark one stage in the phase as backlog (used when a sprint closes)
  is_backlog BOOLEAN NOT NULL DEFAULT false,
  -- For Kanban: optional WIP limit per stage/column
  wip_limit INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (phase_id, stage_order)
);

ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workflow stages: select members/owner" ON public.workflow_stages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = workflow_stages.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = workflow_stages.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Workflow stages: insert members/owner" ON public.workflow_stages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = workflow_stages.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = workflow_stages.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Workflow stages: update members/owner" ON public.workflow_stages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = workflow_stages.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = workflow_stages.organization_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = workflow_stages.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = workflow_stages.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Workflow stages: delete members/owner" ON public.workflow_stages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = workflow_stages.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = workflow_stages.organization_id
        AND om.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_workflow_stages_set_updated_at ON public.workflow_stages;
CREATE TRIGGER trg_workflow_stages_set_updated_at
BEFORE UPDATE ON public.workflow_stages
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------
-- SPRINTS (Scrum time-boxed cycles)
-- -----------------------------------------

CREATE TABLE IF NOT EXISTS public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES public.sdlc_phases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status public.sprint_status_enum NOT NULL DEFAULT 'planned',
  story_points_total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sprints: select members/owner" ON public.sprints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = sprints.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = sprints.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Sprints: insert members/owner" ON public.sprints
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = sprints.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = sprints.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Sprints: update members/owner" ON public.sprints
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = sprints.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = sprints.organization_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = sprints.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = sprints.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Sprints: delete members/owner" ON public.sprints
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = sprints.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = sprints.organization_id
        AND om.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_sprints_set_updated_at ON public.sprints;
CREATE TRIGGER trg_sprints_set_updated_at
BEFORE UPDATE ON public.sprints
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------
-- TASKS
-- -----------------------------------------

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workflow_stage_id UUID NOT NULL REFERENCES public.workflow_stages(id) ON DELETE RESTRICT,

  -- Scrum association (optional)
  sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  due_date DATE,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  blocked BOOLEAN NOT NULL DEFAULT false,
  blocked_reason TEXT,

  -- A task is considered complete when this is set (used for WIP checks)
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks: select members/owner" ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = tasks.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = tasks.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Tasks: insert members/owner" ON public.tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = tasks.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = tasks.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Tasks: update members/owner" ON public.tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = tasks.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = tasks.organization_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = tasks.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = tasks.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Tasks: delete members/owner" ON public.tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = tasks.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = tasks.organization_id
        AND om.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_tasks_set_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_set_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------
-- TASK COMMENTS
-- -----------------------------------------

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task comments: select members/owner" ON public.task_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = task_comments.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = task_comments.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Task comments: insert members/owner" ON public.task_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = task_comments.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = task_comments.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Task comments: delete members/owner" ON public.task_comments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = task_comments.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = task_comments.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- -----------------------------------------
-- AUDIT LOG (basic)
-- -----------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit log: select members/owner" ON public.audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = audit_log.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = audit_log.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Audit log: insert members/owner" ON public.audit_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = audit_log.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = audit_log.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- -----------------------------------------
-- TRIGGERS: Kanban WIP + Scrum sprint auto-backlog
-- -----------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_kanban_wip_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_wip_limit INTEGER;
  v_methodology public.sdlc_methodology_enum;
  v_open_tasks_count INTEGER;
BEGIN
  -- If workflow_stage_id didn't change, don't waste work.
  IF TG_OP = 'UPDATE' AND NEW.workflow_stage_id = OLD.workflow_stage_id THEN
    RETURN NEW;
  END IF;

  SELECT ws.wip_limit, sp.methodology
    INTO v_wip_limit, v_methodology
  FROM public.workflow_stages ws
  JOIN public.sdlc_phases sp ON sp.id = ws.phase_id
  WHERE ws.id = NEW.workflow_stage_id;

  -- Only enforce WIP for Kanban stages with an explicit limit.
  IF v_methodology = 'kanban' AND v_wip_limit IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      SELECT COUNT(*)
        INTO v_open_tasks_count
      FROM public.tasks t
      WHERE t.workflow_stage_id = NEW.workflow_stage_id
        AND t.completed_at IS NULL;
    ELSE
      -- UPDATE case: exclude the row being moved from its previous stage.
      SELECT COUNT(*)
        INTO v_open_tasks_count
      FROM public.tasks t
      WHERE t.workflow_stage_id = NEW.workflow_stage_id
        AND t.completed_at IS NULL
        AND t.id <> OLD.id;
    END IF;

    IF v_open_tasks_count >= v_wip_limit THEN
      RAISE EXCEPTION 'Kanban WIP limit exceeded (stage_id=%, limit=%)', NEW.workflow_stage_id, v_wip_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_enforce_kanban_wip ON public.tasks;
CREATE TRIGGER trg_tasks_enforce_kanban_wip
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_kanban_wip_limit();

CREATE OR REPLACE FUNCTION public.scrum_sprint_on_close_return_unfinished()
RETURNS TRIGGER AS $$
DECLARE
  v_backlog_stage_id UUID;
BEGIN
  -- Only act when sprint transitions into closed state.
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'closed' THEN
    SELECT ws.id
      INTO v_backlog_stage_id
    FROM public.workflow_stages ws
    WHERE ws.phase_id = NEW.phase_id
      AND ws.is_backlog = true
    ORDER BY ws.stage_order ASC
    LIMIT 1;

    IF v_backlog_stage_id IS NOT NULL THEN
      -- Return unfinished tasks to the backlog.
      UPDATE public.tasks
      SET
        sprint_id = NULL,
        workflow_stage_id = v_backlog_stage_id
      WHERE sprint_id = NEW.id
        AND completed_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sprints_on_close_return_unfinished ON public.sprints;
CREATE TRIGGER trg_sprints_on_close_return_unfinished
AFTER UPDATE ON public.sprints
FOR EACH ROW
EXECUTE FUNCTION public.scrum_sprint_on_close_return_unfinished();
