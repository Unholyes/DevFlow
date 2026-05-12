-- Default permission sets per project access level (Admin / Editor / Viewer) per organization.

CREATE TABLE IF NOT EXISTS public.organization_project_access_templates (
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  access_level text NOT NULL CHECK (access_level IN ('Admin', 'Editor', 'Viewer')),
  permissions text[] NOT NULL DEFAULT '{}'::text[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, access_level)
);

CREATE INDEX IF NOT EXISTS organization_project_access_templates_org_idx
  ON public.organization_project_access_templates (organization_id);

DROP TRIGGER IF EXISTS trg_organization_project_access_templates_updated_at
  ON public.organization_project_access_templates;
CREATE TRIGGER trg_organization_project_access_templates_updated_at
  BEFORE UPDATE ON public.organization_project_access_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.organization_project_access_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization_project_access_templates: select for org members"
  ON public.organization_project_access_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_project_access_templates.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- Seed defaults for every existing organization (idempotent).
INSERT INTO public.organization_project_access_templates (organization_id, access_level, permissions)
SELECT o.id, v.access_level, v.permissions
FROM public.organizations o
CROSS JOIN (
  VALUES
    (
      'Admin',
      ARRAY[
        'pm.sprints.manage',
        'pm.phase_gates.approve',
        'pm.timelines.modify',
        'pm.db_schemas.manage',
        'pm.issues.assign_transition',
        'sdlc.sprints.create',
        'sdlc.backlog.manage',
        'dev.repo.access',
        'dev.cicd.trigger',
        'dev.env.manage'
      ]::text[]
    ),
    (
      'Editor',
      ARRAY[
        'pm.sprints.manage',
        'pm.phase_gates.approve',
        'pm.timelines.modify',
        'pm.db_schemas.manage'
      ]::text[]
    ),
    ('Viewer', ARRAY[]::text[])
) AS v(access_level, permissions)
ON CONFLICT (organization_id, access_level) DO NOTHING;

-- Remove legacy custom roles that are now functional tags only.
DELETE FROM public.organization_roles
WHERE lower(trim(name)) IN ('qa lead', 'viewr');
