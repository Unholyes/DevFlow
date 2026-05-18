-- Maps each functional role (job tag) to a project access template (Admin / Editor / Viewer).
-- Effective project permissions come from organization_project_access_templates for that level.

CREATE TABLE IF NOT EXISTS public.organization_functional_role_templates (
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  functional_role text NOT NULL,
  project_access_level text NOT NULL CHECK (project_access_level IN ('Admin', 'Editor', 'Viewer')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, functional_role)
);

CREATE INDEX IF NOT EXISTS organization_functional_role_templates_org_idx
  ON public.organization_functional_role_templates (organization_id);

DROP TRIGGER IF EXISTS trg_organization_functional_role_templates_updated_at
  ON public.organization_functional_role_templates;
CREATE TRIGGER trg_organization_functional_role_templates_updated_at
  BEFORE UPDATE ON public.organization_functional_role_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.organization_functional_role_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization_functional_role_templates: select for org members"
  ON public.organization_functional_role_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_functional_role_templates.organization_id
        AND om.user_id = auth.uid()
    )
  );

INSERT INTO public.organization_functional_role_templates (organization_id, functional_role, project_access_level)
SELECT o.id, v.functional_role, v.project_access_level
FROM public.organizations o
CROSS JOIN (
  VALUES
    ('project_manager', 'Admin'),
    ('lead_developer', 'Editor'),
    ('qa_engineer', 'Viewer'),
    ('business_analyst', 'Editor'),
    ('designer', 'Viewer'),
    ('devops_engineer', 'Editor'),
    ('tech_writer', 'Viewer')
) AS v(functional_role, project_access_level)
ON CONFLICT (organization_id, functional_role) DO NOTHING;
