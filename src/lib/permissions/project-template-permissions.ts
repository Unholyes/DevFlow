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
