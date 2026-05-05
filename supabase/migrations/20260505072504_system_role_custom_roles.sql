-- Introduce hierarchical system_role + custom_roles on organization_members
-- Owners are stored on organization_members.system_role (organizations.owner_id no longer used for auth decisions)

BEGIN;

-- 1) Add system_role + rename roles[] -> custom_roles[]
ALTER TABLE IF EXISTS public.organization_members
  ADD COLUMN IF NOT EXISTS system_role text NOT NULL DEFAULT 'Member';

-- Rename roles -> custom_roles if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organization_members'
      AND column_name = 'roles'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organization_members'
      AND column_name = 'custom_roles'
  ) THEN
    ALTER TABLE public.organization_members RENAME COLUMN roles TO custom_roles;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.organization_members
  ALTER COLUMN custom_roles SET DEFAULT ARRAY[]::text[];

-- Ensure non-null array
UPDATE public.organization_members
SET custom_roles = ARRAY[]::text[]
WHERE custom_roles IS NULL;

-- system_role constraint
ALTER TABLE IF EXISTS public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_system_role_check;

ALTER TABLE IF EXISTS public.organization_members
  ADD CONSTRAINT organization_members_system_role_check
  CHECK (system_role IN ('Owner', 'Admin', 'Member'));

-- 2) Backfill system_role and sanitize custom_roles
-- 2a) Ensure org owners are members and marked as Owner
INSERT INTO public.organization_members (organization_id, user_id, system_role, custom_roles)
SELECT o.id, o.owner_id, 'Owner', ARRAY[]::text[]
FROM public.organizations o
WHERE o.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = o.id
      AND om.user_id = o.owner_id
  );

UPDATE public.organization_members om
SET system_role = 'Owner'
FROM public.organizations o
WHERE o.id = om.organization_id
  AND o.owner_id = om.user_id;

-- 2b) Non-owners: if legacy array had Admin, set system_role=Admin (otherwise Member)
UPDATE public.organization_members om
SET system_role = 'Admin'
WHERE om.system_role <> 'Owner'
  AND EXISTS (
    SELECT 1
    FROM unnest(om.custom_roles) r
    WHERE trim(lower(r)) = 'admin'
  );

UPDATE public.organization_members om
SET system_role = 'Member'
WHERE om.system_role IS NULL
   OR om.system_role NOT IN ('Owner', 'Admin', 'Member');

-- 2c) Remove built-in names from custom_roles; keep only custom role names
UPDATE public.organization_members om
SET custom_roles = (
  SELECT COALESCE(
    array_agg(trim(r)) FILTER (WHERE trim(r) <> ''),
    ARRAY[]::text[]
  )
  FROM unnest(om.custom_roles) r
  WHERE trim(lower(r)) NOT IN ('owner', 'admin', 'project manager', 'member', 'project_manager', 'viewer', 'guest', 'ai_assistant')
)
WHERE om.custom_roles IS NOT NULL;

-- 3) Update helper functions used by RLS
CREATE OR REPLACE FUNCTION private.is_org_owner(p_org_id uuid)
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
      AND om.system_role = 'Owner'
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
      AND om.system_role IN ('Owner', 'Admin')
  );
$$;

CREATE OR REPLACE FUNCTION private.is_org_admin_only(p_org_id uuid)
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
      AND om.system_role = 'Admin'
  );
$$;

GRANT EXECUTE ON FUNCTION private.is_org_admin_only(uuid) TO authenticated;

-- 4) RLS policies for organization_members hierarchy
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organization admins can insert members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can delete members" ON public.organization_members;

-- Insert: Owners can insert any system_role; Admins can insert Members only.
CREATE POLICY "Owners can insert any member" ON public.organization_members
  FOR INSERT WITH CHECK (
    private.is_org_owner(organization_id)
  );

CREATE POLICY "Admins can insert members" ON public.organization_members
  FOR INSERT WITH CHECK (
    private.is_org_admin_only(organization_id)
    AND system_role = 'Member'
  );

-- Update: Owners can update any member row.
CREATE POLICY "Owners can update any member" ON public.organization_members
  FOR UPDATE USING (
    private.is_org_owner(organization_id)
  ) WITH CHECK (
    private.is_org_owner(organization_id)
  );

-- Update: Admins can update member rows only (custom_roles) and cannot change system_role.
CREATE POLICY "Admins can update member custom roles" ON public.organization_members
  FOR UPDATE USING (
    private.is_org_admin_only(organization_id)
    AND system_role = 'Member'
  ) WITH CHECK (
    private.is_org_admin_only(organization_id)
    AND system_role = 'Member'
  );

-- Delete: Owners only.
CREATE POLICY "Owners can delete members" ON public.organization_members
  FOR DELETE USING (
    private.is_org_owner(organization_id)
  );

-- 5) Team invitations: store requested system_role (Owner/Admin/Member)
ALTER TABLE IF EXISTS public.team_invitations
  ADD COLUMN IF NOT EXISTS system_role text NOT NULL DEFAULT 'Member';

ALTER TABLE IF EXISTS public.team_invitations
  DROP CONSTRAINT IF EXISTS team_invitations_system_role_check;

ALTER TABLE IF EXISTS public.team_invitations
  ADD CONSTRAINT team_invitations_system_role_check
  CHECK (system_role IN ('Owner', 'Admin', 'Member'));

-- Update team_invitations RLS policies to stop referencing organization_members.roles (renamed to custom_roles)
DROP POLICY IF EXISTS "Organization members can view invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Organization admins can create invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Organization admins can update invitations" ON public.team_invitations;

CREATE POLICY "Organization members can view invitations" ON public.team_invitations
  FOR SELECT USING (
    private.is_org_member(team_invitations.organization_id)
    OR private.is_org_admin(team_invitations.organization_id)
  );

CREATE POLICY "Organization admins can create invitations" ON public.team_invitations
  FOR INSERT WITH CHECK (
    private.is_org_admin(team_invitations.organization_id)
  );

CREATE POLICY "Organization admins can update invitations" ON public.team_invitations
  FOR UPDATE USING (
    private.is_org_admin(team_invitations.organization_id)
  );

COMMIT;
