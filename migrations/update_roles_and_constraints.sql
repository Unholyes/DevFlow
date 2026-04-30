-- Update role constraints and support multi-role members

-- 1) organization_default_roles CHECK constraint (and normalize existing data)
ALTER TABLE IF EXISTS public.organization_default_roles
  DROP CONSTRAINT IF EXISTS organization_default_roles_role_check;

UPDATE public.organization_default_roles
SET role = CASE role
  WHEN 'admin' THEN 'Admin'
  WHEN 'project_manager' THEN 'Project Manager'
  WHEN 'member' THEN 'Member'
  WHEN 'viewer' THEN 'Member'
  WHEN 'guest' THEN 'Member'
  ELSE role
END
WHERE role IN ('admin', 'project_manager', 'member', 'viewer', 'guest');

ALTER TABLE IF EXISTS public.organization_default_roles
  ADD CONSTRAINT organization_default_roles_role_check
  CHECK (role IN ('Admin', 'Project Manager', 'Member'));

-- 2) organization_members: normalize role values and introduce roles[]
ALTER TABLE IF EXISTS public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

UPDATE public.organization_members
SET role = CASE role
  WHEN 'admin' THEN 'Admin'
  WHEN 'project_manager' THEN 'Project Manager'
  WHEN 'member' THEN 'Member'
  WHEN 'ai_assistant' THEN 'Member'
  ELSE role
END
WHERE role IN ('admin', 'project_manager', 'member', 'ai_assistant');

-- Keep any existing 'admin' rows consistent if they already used Title Case
UPDATE public.organization_members
SET role = 'Admin'
WHERE role = 'admin';

-- Update helper function to new role value
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
      AND om.role = 'Admin'
  );
$$;

ALTER TABLE IF EXISTS public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('Admin', 'Project Manager', 'Member'));

ALTER TABLE IF EXISTS public.organization_members
  ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT ARRAY['Member']::text[];

UPDATE public.organization_members
SET roles = ARRAY[role]::text[]
WHERE roles IS NULL OR array_length(roles, 1) IS NULL;

