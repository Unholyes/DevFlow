/**
 * Project access level on `project_members` selects an org template (Admin / Editor / Viewer).
 * Permissions live in `project-template-permissions.ts`; functional roles are descriptive tags only.
 */

export {
  PROJECT_ACCESS_LEVELS,
  PROJECT_FUNCTIONAL_ROLES,
  FUNCTIONAL_ROLE_OPTIONS,
  type ProjectAccessLevel,
  type FunctionalRoleId,
  getFunctionalRoleOption,
} from '@/lib/permissions/project-template-permissions'
