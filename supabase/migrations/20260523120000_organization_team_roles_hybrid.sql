-- Hybrid team roles: org catalog + per-project roles (inherit or customize).

CREATE TABLE IF NOT EXISTS public.organization_team_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  permissions text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_team_roles_slug_check CHECK (slug ~ '^[a-z][a-z0-9_]{0,63}$'),
  UNIQUE (organization_id, slug),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS organization_team_roles_org_idx
  ON public.organization_team_roles (organization_id);

DROP TRIGGER IF EXISTS trg_organization_team_roles_updated_at ON public.organization_team_roles;
CREATE TRIGGER trg_organization_team_roles_updated_at
  BEFORE UPDATE ON public.organization_team_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.project_team_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  organization_team_role_id uuid REFERENCES public.organization_team_roles (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  permissions text[] NOT NULL DEFAULT '{}'::text[],
  inherits_from_org boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS project_team_roles_project_org_role_uidx
  ON public.project_team_roles (project_id, organization_team_role_id)
  WHERE organization_team_role_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS project_team_roles_project_only_name_uidx
  ON public.project_team_roles (project_id, lower(name))
  WHERE organization_team_role_id IS NULL;

CREATE INDEX IF NOT EXISTS project_team_roles_project_idx
  ON public.project_team_roles (project_id);

DROP TRIGGER IF EXISTS trg_project_team_roles_updated_at ON public.project_team_roles;
CREATE TRIGGER trg_project_team_roles_updated_at
  BEFORE UPDATE ON public.project_team_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS project_team_role_id uuid REFERENCES public.project_team_roles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS project_members_project_team_role_idx
  ON public.project_members (project_team_role_id)
  WHERE project_team_role_id IS NOT NULL;

ALTER TABLE public.organization_team_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization_team_roles: select for org members"
  ON public.organization_team_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_team_roles.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "project_team_roles: select for org members"
  ON public.project_team_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = project_team_roles.project_id
        AND om.user_id = auth.uid()
    )
  );

-- Seed default org team roles for every organization.
INSERT INTO public.organization_team_roles (organization_id, slug, name, description, permissions)
SELECT o.id, v.slug, v.name, v.description, v.permissions
FROM public.organizations o
CROSS JOIN (
  VALUES
    (
      'project_manager',
      'Project Manager',
      'Planning, gates, and sprint oversight',
      ARRAY[
        'pm.sprints.manage',
        'pm.phase_gates.approve',
        'pm.project_members.manage',
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
      'lead_developer',
      'Lead Developer',
      'Delivery and technical execution',
      ARRAY[
        'pm.sprints.manage',
        'pm.phase_gates.approve',
        'pm.timelines.modify',
        'pm.db_schemas.manage'
      ]::text[]
    ),
    (
      'qa_engineer',
      'QA Engineer',
      'Testing and quality validation',
      ARRAY[]::text[]
    ),
    (
      'business_analyst',
      'Business Analyst',
      'Requirements and backlog refinement',
      ARRAY[
        'pm.sprints.manage',
        'pm.phase_gates.approve',
        'pm.timelines.modify',
        'pm.db_schemas.manage'
      ]::text[]
    ),
    (
      'designer',
      'Designer',
      'UX and design deliverables',
      ARRAY[]::text[]
    ),
    (
      'devops_engineer',
      'DevOps Engineer',
      'Pipelines, environments, and releases',
      ARRAY[
        'pm.sprints.manage',
        'pm.phase_gates.approve',
        'pm.timelines.modify',
        'pm.db_schemas.manage'
      ]::text[]
    ),
    (
      'tech_writer',
      'Technical Writer',
      'Documentation and release notes',
      ARRAY[]::text[]
    )
) AS v(slug, name, description, permissions)
ON CONFLICT (organization_id, slug) DO NOTHING;

-- Materialize org roles onto every project.
INSERT INTO public.project_team_roles (
  project_id,
  organization_team_role_id,
  name,
  description,
  permissions,
  inherits_from_org
)
SELECT
  p.id,
  otr.id,
  otr.name,
  otr.description,
  otr.permissions,
  true
FROM public.projects p
JOIN public.organization_team_roles otr ON otr.organization_id = p.organization_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.project_team_roles existing
  WHERE existing.project_id = p.id
    AND existing.organization_team_role_id = otr.id
);

-- Apply per-project overrides from legacy functional role templates.
UPDATE public.project_team_roles ptr
SET
  permissions = pfr.permissions,
  inherits_from_org = false
FROM public.project_functional_role_templates pfr
JOIN public.organization_team_roles otr
  ON otr.organization_id = (
    SELECT organization_id FROM public.projects WHERE id = pfr.project_id
  )
  AND otr.slug = pfr.functional_role
WHERE ptr.project_id = pfr.project_id
  AND ptr.organization_team_role_id = otr.id;

-- Link members to project team roles via legacy functional_role slug.
UPDATE public.project_members pm
SET project_team_role_id = ptr.id
FROM public.project_team_roles ptr
JOIN public.organization_team_roles otr ON otr.id = ptr.organization_team_role_id
WHERE pm.project_id = ptr.project_id
  AND pm.functional_role IS NOT NULL
  AND otr.slug = pm.functional_role
  AND pm.project_team_role_id IS NULL;
