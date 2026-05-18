-- Grant pm.project_members.manage on workspace Admin default account roles (hybrid with project templates).
-- `organization_default_roles.permissions` is jsonb (array of permission id strings).

UPDATE public.organization_default_roles
SET permissions = COALESCE(permissions, '[]'::jsonb) || '["pm.project_members.manage"]'::jsonb
WHERE role = 'Admin'
  AND NOT COALESCE(permissions, '[]'::jsonb) @> '["pm.project_members.manage"]'::jsonb;
