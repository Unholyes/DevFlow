import type { UserRole } from '@/types'

export type DashboardNavItem = {
  name: string
  href: string
}

export type SearchSuggestionKind = 'project' | 'feature' | 'task'

export type DashboardSearchSuggestion = {
  id: string
  label: string
  href: string
  type: SearchSuggestionKind
  description?: string
}

export const TENANT_MEMBER_NAV: DashboardNavItem[] = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Tasks', href: '/dashboard/tasks' },
  { name: 'Calendar', href: '/dashboard/calendar' },
  { name: 'Team', href: '/dashboard/team' },
  { name: 'Reports & Analytics', href: '/dashboard/reports' },
]

export const TENANT_ADMIN_NAV: DashboardNavItem[] = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Accounts', href: '/dashboard/accounts' },
  { name: 'Projects', href: '/dashboard/projects' },
  { name: 'Reports & Analytics', href: '/dashboard/reports' },
]

const SHARED_SEARCH: DashboardSearchSuggestion[] = [
  {
    id: 'feature-dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    type: 'feature',
    description: 'Go to dashboard home',
  },
  {
    id: 'feature-reports',
    label: 'Reports & Analytics',
    href: '/dashboard/reports',
    type: 'feature',
    description: 'View reports and analytics',
  },
  {
    id: 'feature-settings',
    label: 'Settings',
    href: '/settings',
    type: 'feature',
    description: 'Open settings home',
  },
  {
    id: 'feature-manage-profile',
    label: 'Manage Profile',
    href: '/settings/profile',
    type: 'feature',
    description: 'Update profile details',
  },
]

const TENANT_MEMBER_SEARCH: DashboardSearchSuggestion[] = [
  ...SHARED_SEARCH,
  {
    id: 'feature-tasks',
    label: 'Tasks',
    href: '/dashboard/tasks',
    type: 'feature',
    description: 'View tasks assigned to you',
  },
  {
    id: 'feature-calendar',
    label: 'Calendar',
    href: '/dashboard/calendar',
    type: 'feature',
    description: 'View calendar schedule',
  },
  {
    id: 'feature-team',
    label: 'Team',
    href: '/dashboard/team',
    type: 'feature',
    description: 'View team members',
  },
]

const TENANT_ADMIN_SEARCH: DashboardSearchSuggestion[] = [
  ...SHARED_SEARCH,
  {
    id: 'feature-accounts',
    label: 'Accounts',
    href: '/dashboard/accounts',
    type: 'feature',
    description: 'Manage workspace accounts',
  },
  {
    id: 'feature-projects',
    label: 'Projects',
    href: '/dashboard/projects',
    type: 'feature',
    description: 'Browse all projects',
  },
  {
    id: 'feature-organization-settings',
    label: 'Organization Settings',
    href: '/settings/organization',
    type: 'feature',
    description: 'Manage organization details',
  },
  {
    id: 'feature-permissions',
    label: 'Permissions',
    href: '/settings/permissions',
    type: 'feature',
    description: 'Review team permissions',
  },
]

export function getDashboardNavItems(role: UserRole): DashboardNavItem[] {
  return role === 'tenant_admin' ? TENANT_ADMIN_NAV : TENANT_MEMBER_NAV
}

export function getSearchSuggestionsForRole(role: UserRole): DashboardSearchSuggestion[] {
  return role === 'tenant_admin' ? TENANT_ADMIN_SEARCH : TENANT_MEMBER_SEARCH
}

export function getSearchPlaceholder(role: UserRole): string {
  if (role === 'tenant_admin') {
    return 'Search projects, accounts, and settings...'
  }
  return 'Search your tasks, projects, and pages...'
}

const PROJECT_DETAIL_RE = /^\/dashboard\/projects\/([^/]+)(?:\/|$)/

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** Routes only tenant admins may open. */
const TENANT_ADMIN_ONLY_PREFIXES = ['/dashboard/accounts', '/dashboard/teams']

/** Routes only tenant members may open. */
const TENANT_MEMBER_ONLY_PREFIXES = ['/dashboard/tasks', '/dashboard/calendar', '/dashboard/team']

const TENANT_ADMIN_SETTINGS_PREFIXES = ['/settings/organization', '/settings/permissions']

export function canAccessDashboardPath(role: UserRole, pathname: string): boolean {
  const path = normalizePath(pathname)

  if (path.startsWith('/settings')) {
    if (role === 'team_member') {
      if (TENANT_ADMIN_SETTINGS_PREFIXES.some((p) => matchesPrefix(path, p))) return false
      return path === '/settings' || path.startsWith('/settings/profile')
    }
    return true
  }

  if (!path.startsWith('/dashboard')) return true

  if (role === 'tenant_admin') {
    if (TENANT_MEMBER_ONLY_PREFIXES.some((p) => matchesPrefix(path, p))) return false
    if (path === '/dashboard/projects/new') return true
    if (path === '/dashboard/projects') return true
    if (PROJECT_DETAIL_RE.test(path)) return true
    if (TENANT_ADMIN_ONLY_PREFIXES.some((p) => matchesPrefix(path, p))) return true
    if (path === '/dashboard' || path === '/dashboard/reports' || matchesPrefix(path, '/dashboard/reports')) {
      return true
    }
    return path === '/dashboard' || matchesPrefix(path, '/dashboard/projects')
  }

  // team_member
  if (TENANT_ADMIN_ONLY_PREFIXES.some((p) => matchesPrefix(path, p))) return false
  if (path === '/dashboard/projects' || path === '/dashboard/projects/new') return false
  if (PROJECT_DETAIL_RE.test(path)) return true
  if (TENANT_MEMBER_ONLY_PREFIXES.some((p) => matchesPrefix(path, p))) return true
  if (path === '/dashboard' || matchesPrefix(path, '/dashboard/reports')) return true

  return false
}

export function extractProjectIdFromPath(pathname: string): string | null {
  const match = normalizePath(pathname).match(PROJECT_DETAIL_RE)
  return match?.[1] ?? null
}

export function defaultDashboardHomeForRole(role: UserRole): string {
  return '/dashboard'
}
