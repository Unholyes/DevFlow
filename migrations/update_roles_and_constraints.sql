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
  ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT ARRAY['Member']::text[];

UPDATE public.organization_members
SET roles = (
  SELECT COALESCE(
    array_agg(
      CASE trim(lower(r))
        WHEN 'admin' THEN 'Admin'
        WHEN 'project_manager' THEN 'Project Manager'
        WHEN 'member' THEN 'Member'
        WHEN 'viewer' THEN 'Member'
        WHEN 'guest' THEN 'Member'
        WHEN 'ai_assistant' THEN 'Member'
        ELSE trim(r)
      END
    ),
    ARRAY['Member']::text[]
  )
  FROM unnest(roles) AS r
)
WHERE roles IS NOT NULL;

UPDATE public.organization_members
SET roles = ARRAY['Member']::text[]
WHERE roles IS NULL OR array_length(roles, 1) IS NULL OR array_length(roles, 1) = 0;

-- Update helper function to array-based check
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
      AND 'Admin' = ANY(om.roles)
  );
$$;

