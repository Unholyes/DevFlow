-- Per-project permission sets for functional roles (QA Engineer, DevOps, etc.).

CREATE TABLE IF NOT EXISTS public.project_functional_role_templates (
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  functional_role text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}'::text[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, functional_role)
);

CREATE INDEX IF NOT EXISTS project_functional_role_templates_project_idx
  ON public.project_functional_role_templates (project_id);

DROP TRIGGER IF EXISTS trg_project_functional_role_templates_updated_at
  ON public.project_functional_role_templates;
CREATE TRIGGER trg_project_functional_role_templates_updated_at
  BEFORE UPDATE ON public.project_functional_role_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.project_functional_role_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_functional_role_templates: select for org members"
  ON public.project_functional_role_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = project_functional_role_templates.project_id
        AND om.user_id = auth.uid()
    )
  );
