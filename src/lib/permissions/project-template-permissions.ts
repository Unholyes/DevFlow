/**
 * Permissions configurable per organization for each project access template
 * (Admin / Editor / Viewer). Stored in `organization_project_access_templates`.
 * Distinct from account-level (`organization_default_roles`) permissions.
 */

export type ProjectTemplatePermissionCategory = 'Project Management' | 'SDLC Management' | 'Development'

export type ProjectTemplatePermissionId =
  | 'pm.sprints.manage'
  | 'pm.phase_gates.approve'
  | 'pm.timelines.modify'
  | 'pm.db_schemas.manage'
  | 'pm.issues.assign_transition'
  | 'sdlc.sprints.create'
  | 'sdlc.backlog.manage'
  | 'dev.repo.access'
  | 'dev.cicd.trigger'
  | 'dev.env.manage'

const TEMPLATE_CATEGORY_ORDER: ProjectTemplatePermissionCategory[] = [
  'Project Management',
  'SDLC Management',
  'Development',
]

export const PROJECT_TEMPLATE_PERMISSIONS: Array<{
  id: ProjectTemplatePermissionId
  category: ProjectTemplatePermissionCategory
  label: string
}> = [
  { id: 'pm.sprints.manage', category: 'Project Management', label: 'Manage sprint cycles' },
  { id: 'pm.phase_gates.approve', category: 'Project Management', label: 'Approve phase gate transitions' },
  { id: 'pm.timelines.modify', category: 'Project Management', label: 'Modify project timelines / Gantt charts' },
  { id: 'pm.db_schemas.manage', category: 'Project Management', label: 'Manage database schemas' },
  { id: 'pm.issues.assign_transition', category: 'Project Management', label: 'Assign and transition issue tickets' },
  { id: 'sdlc.sprints.create', category: 'SDLC Management', label: 'Create sprints' },
  { id: 'sdlc.backlog.manage', category: 'SDLC Management', label: 'Backlog management' },
  { id: 'dev.repo.access', category: 'Development', label: 'Repository access' },
  { id: 'dev.cicd.trigger', category: 'Development', label: 'Trigger CI/CD pipelines' },
  { id: 'dev.env.manage', category: 'Development', label: 'Manage environment variables' },
]

const TEMPLATE_ID_SET = new Set(PROJECT_TEMPLATE_PERMISSIONS.map((p) => p.id.toLowerCase()))

export function isProjectTemplatePermissionId(id: string): boolean {
  return TEMPLATE_ID_SET.has(id.trim().toLowerCase())
}

export function filterToProjectTemplatePermissions(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of permissions) {
    if (typeof raw !== 'string') continue
    const id = raw.trim()
    if (!isProjectTemplatePermissionId(id)) continue
    const k = id.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(id)
  }
  return out
}

function groupTemplateByCategory() {
  const groups = new Map<ProjectTemplatePermissionCategory, typeof PROJECT_TEMPLATE_PERMISSIONS>()
  for (const p of PROJECT_TEMPLATE_PERMISSIONS) {
    const arr = groups.get(p.category) ?? []
    arr.push(p)
    groups.set(p.category, arr)
  }
  return groups
}

const TEMPLATE_GROUPS = groupTemplateByCategory()

export const ORDERED_PROJECT_TEMPLATE_GROUPS: Array<
  [ProjectTemplatePermissionCategory, typeof PROJECT_TEMPLATE_PERMISSIONS]
> = TEMPLATE_CATEGORY_ORDER.map((c) => {
  const perms = TEMPLATE_GROUPS.get(c) ?? []
  return [c, perms] as [ProjectTemplatePermissionCategory, typeof PROJECT_TEMPLATE_PERMISSIONS]
}).filter((entry) => entry[1].length > 0)

export const ALL_PROJECT_TEMPLATE_PERMISSION_IDS = PROJECT_TEMPLATE_PERMISSIONS.map((p) => p.id)

export const PM_SPRINTS_MANAGE = 'pm.sprints.manage' as const satisfies ProjectTemplatePermissionId
export const PM_PHASE_GATES_APPROVE = 'pm.phase_gates.approve' as const satisfies ProjectTemplatePermissionId
export const SDLC_SPRINTS_CREATE = 'sdlc.sprints.create' as const satisfies ProjectTemplatePermissionId

export const PROJECT_ACCESS_LEVELS = ['Admin', 'Editor', 'Viewer'] as const
export type ProjectAccessLevel = (typeof PROJECT_ACCESS_LEVELS)[number]

export type FunctionalRoleId =
  | 'project_manager'
  | 'lead_developer'
  | 'qa_engineer'
  | 'business_analyst'
  | 'designer'
  | 'devops_engineer'
  | 'tech_writer'

/** Descriptive job tags on project_members; they do not grant permissions. */
export const PROJECT_FUNCTIONAL_ROLES: Array<{
  id: FunctionalRoleId
  label: string
  description: string
}> = [
  {
    id: 'project_manager',
    label: 'Project Manager',
    description: 'Planning, gates, and sprint oversight',
  },
  {
    id: 'lead_developer',
    label: 'Lead Developer',
    description: 'Delivery and technical execution',
  },
  {
    id: 'qa_engineer',
    label: 'QA Engineer',
    description: 'Testing and quality validation',
  },
  {
    id: 'business_analyst',
    label: 'Business Analyst',
    description: 'Requirements and backlog refinement',
  },
  {
    id: 'designer',
    label: 'Designer',
    description: 'UX and design deliverables',
  },
  {
    id: 'devops_engineer',
    label: 'DevOps Engineer',
    description: 'Pipelines, environments, and releases',
  },
  {
    id: 'tech_writer',
    label: 'Technical Writer',
    description: 'Documentation and release notes',
  },
]

/** @deprecated Use `PROJECT_FUNCTIONAL_ROLES` */
export const FUNCTIONAL_ROLE_OPTIONS = PROJECT_FUNCTIONAL_ROLES.map((r) => ({
  value: r.id,
  label: r.label,
}))

const FUNCTIONAL_ROLE_ID_SET = new Set(PROJECT_FUNCTIONAL_ROLES.map((r) => r.id))

export function isFunctionalRoleId(id: string): boolean {
  return FUNCTIONAL_ROLE_ID_SET.has(id.trim() as FunctionalRoleId)
}

export function getFunctionalRoleOption(id: string) {
  return PROJECT_FUNCTIONAL_ROLES.find((r) => r.id === id)
}

const PERMISSION_LABEL_BY_ID = new Map(
  PROJECT_TEMPLATE_PERMISSIONS.map((p) => [p.id.toLowerCase(), p.label] as const),
)

export function getProjectTemplatePermissionLabel(id: string): string {
  return PERMISSION_LABEL_BY_ID.get(id.trim().toLowerCase()) ?? id
}

export function resolveTemplatePermissionsForLevel(
  level: ProjectAccessLevel,
  templatesByLevel: Record<ProjectAccessLevel, string[]>,
): string[] {
  const fromOrg = templatesByLevel[level]
  if (fromOrg?.length) return filterToProjectTemplatePermissions(fromOrg)
  return defaultProjectTemplatePermissions(level)
}

/** Matches `organization_project_access_templates` seed migration defaults. */
export const DEFAULT_PROJECT_TEMPLATE_PERMISSIONS: Record<ProjectAccessLevel, readonly ProjectTemplatePermissionId[]> = {
  Admin: [
    'pm.sprints.manage',
    'pm.phase_gates.approve',
    'pm.timelines.modify',
    'pm.db_schemas.manage',
    'pm.issues.assign_transition',
    'sdlc.sprints.create',
    'sdlc.backlog.manage',
    'dev.repo.access',
    'dev.cicd.trigger',
    'dev.env.manage',
  ],
  Editor: ['pm.sprints.manage', 'pm.phase_gates.approve', 'pm.timelines.modify', 'pm.db_schemas.manage'],
  Viewer: [],
}

export function defaultProjectTemplatePermissions(level: ProjectAccessLevel): string[] {
  return filterToProjectTemplatePermissions([...DEFAULT_PROJECT_TEMPLATE_PERMISSIONS[level]])
}
