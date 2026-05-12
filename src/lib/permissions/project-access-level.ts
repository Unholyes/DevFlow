/**
 * Project access level (per `project_members.project_access_level`) determines which
 * project-scoped capabilities a user has inside a single project. This is separate
 * from organization `system_role` (Owner / Admin / Member) and from `functional_role`
 * (a descriptive tag only).
 */

export const PROJECT_ACCESS_LEVELS = ['Admin', 'Editor', 'Viewer'] as const
export type ProjectAccessLevel = (typeof PROJECT_ACCESS_LEVELS)[number]

/** Stable ids aligned with legacy permission strings used elsewhere in the app. */
export const PROJECT_SCOPED_CAPABILITY_IDS = [
  'pm.sprints.manage',
  'pm.phase_gates.approve',
  'pm.timelines.modify',
  'pm.db_schemas.manage',
  'dev.repo.access',
  'dev.cicd.trigger',
] as const

export type ProjectScopedCapabilityId = (typeof PROJECT_SCOPED_CAPABILITY_IDS)[number]

export const PROJECT_SCOPED_CAPABILITY_LABELS: Record<ProjectScopedCapabilityId, string> = {
  'pm.sprints.manage': 'Manage sprint cycles',
  'pm.phase_gates.approve': 'Approve phase gate transitions',
  'pm.timelines.modify': 'Modify project timelines / Gantt charts',
  'pm.db_schemas.manage': 'Manage database schemas',
  'dev.repo.access': 'Repository access',
  'dev.cicd.trigger': 'Trigger CI/CD pipelines',
}

/**
 * Which project-scoped capabilities each access level includes.
 * Viewer is read-only for project tools (no project-scoped write caps).
 */
export const PROJECT_ACCESS_CAPABILITY_MATRIX: Record<ProjectAccessLevel, ProjectScopedCapabilityId[]> = {
  Admin: [...PROJECT_SCOPED_CAPABILITY_IDS],
  Editor: ['pm.sprints.manage', 'pm.phase_gates.approve', 'pm.timelines.modify', 'pm.db_schemas.manage'],
  Viewer: [],
}

export const FUNCTIONAL_ROLE_OPTIONS = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'lead_developer', label: 'Lead Developer' },
  { value: 'qa_engineer', label: 'QA Engineer' },
  { value: 'business_analyst', label: 'Business Analyst' },
  { value: 'designer', label: 'Designer' },
  { value: 'devops_engineer', label: 'DevOps Engineer' },
  { value: 'tech_writer', label: 'Technical Writer' },
] as const
