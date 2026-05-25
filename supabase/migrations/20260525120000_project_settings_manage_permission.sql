-- Add pm.project_settings.manage to default Admin project access templates and account Admin role.

UPDATE public.organization_project_access_templates
SET permissions = array_append(permissions, 'pm.project_settings.manage')
WHERE access_level = 'Admin'
  AND NOT ('pm.project_settings.manage' = ANY (permissions));

UPDATE public.organization_default_roles
SET permissions = COALESCE(permissions, '[]'::jsonb) || '["pm.project_settings.manage"]'::jsonb
WHERE role = 'Admin'
  AND NOT COALESCE(permissions, '[]'::jsonb) @> '["pm.project_settings.manage"]'::jsonb;
