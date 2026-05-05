-- 1. Ensure `roles` array exists and captures the primary `role` if empty
UPDATE public.organization_members
SET roles = ARRAY[role]
WHERE roles IS NULL OR array_length(roles, 1) IS NULL;

-- 2. Append the `role` to the `roles` array if it isn't already in it
UPDATE public.organization_members
SET roles = array_append(roles, role)
WHERE role IS NOT NULL AND NOT (role = ANY(roles));

-- Team invitations policies (older schema) referenced `organization_members.role`.
-- Drop them before dropping the column, then recreate using roles[].
DROP POLICY IF EXISTS "Organization admins can create invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Organization admins can update invitations" ON public.team_invitations;

-- 3. Drop the redundant `role` column
ALTER TABLE public.organization_members DROP COLUMN role;

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
      AND 'Admin' = ANY(om.roles)
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
      AND 'Admin' = ANY(om.roles)
    )
  );