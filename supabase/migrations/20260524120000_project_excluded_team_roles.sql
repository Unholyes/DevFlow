-- Track workspace team roles explicitly removed from a project (so sync does not re-add them).

CREATE TABLE IF NOT EXISTS public.project_excluded_organization_team_roles (
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  organization_team_role_id uuid NOT NULL REFERENCES public.organization_team_roles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, organization_team_role_id)
);

CREATE INDEX IF NOT EXISTS project_excluded_organization_team_roles_project_idx
  ON public.project_excluded_organization_team_roles (project_id);

ALTER TABLE public.project_excluded_organization_team_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_excluded_organization_team_roles: select for org members"
  ON public.project_excluded_organization_team_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = project_excluded_organization_team_roles.project_id
        AND om.user_id = auth.uid()
    )
  );
