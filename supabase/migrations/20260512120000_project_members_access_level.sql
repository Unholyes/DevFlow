-- Project team: one project_access_level per (project_id, user_id) + optional functional_role tag.
-- Replaces legacy project_members.role when present.

ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS project_access_level text,
  ADD COLUMN IF NOT EXISTS functional_role text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_members'
      AND column_name = 'role'
  ) THEN
    UPDATE public.project_members
    SET project_access_level = CASE lower(coalesce(role, ''))
        WHEN 'tenant_admin' THEN 'Admin'
        WHEN 'developer' THEN 'Editor'
        ELSE 'Editor'
      END
    WHERE project_access_level IS NULL;
  ELSE
    UPDATE public.project_members
    SET project_access_level = 'Editor'
    WHERE project_access_level IS NULL;
  END IF;
END $$;

ALTER TABLE public.project_members
  ALTER COLUMN project_access_level SET DEFAULT 'Viewer';

UPDATE public.project_members
SET project_access_level = CASE lower(trim(project_access_level))
    WHEN 'admin' THEN 'Admin'
    WHEN 'editor' THEN 'Editor'
    WHEN 'viewer' THEN 'Viewer'
    ELSE coalesce(project_access_level, 'Viewer')
  END;

ALTER TABLE public.project_members
  ALTER COLUMN project_access_level SET NOT NULL;

ALTER TABLE public.project_members
  DROP CONSTRAINT IF EXISTS project_members_project_access_level_check;

ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_project_access_level_check
  CHECK (project_access_level IN ('Admin', 'Editor', 'Viewer'));

ALTER TABLE public.project_members
  DROP CONSTRAINT IF EXISTS project_members_role_check;

ALTER TABLE public.project_members
  DROP COLUMN IF EXISTS role;
