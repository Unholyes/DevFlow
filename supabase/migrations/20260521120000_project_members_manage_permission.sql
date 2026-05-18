-- Add pm.project_members.manage to default Admin project access templates.

UPDATE public.organization_project_access_templates
SET permissions = array_append(permissions, 'pm.project_members.manage')
WHERE access_level = 'Admin'
  AND NOT ('pm.project_members.manage' = ANY (permissions));
