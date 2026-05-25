'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Settings,
  FolderOpen,
  BarChart3,
  UserCog,
  Users,
  CheckSquare,
  Calendar,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'
import { useOrganizationName } from '@/lib/hooks/use-organization-name'
import { getDashboardNavItems } from '@/lib/dashboard/dashboard-access'

export type SidebarProject = { id: string; name: string }

function sidebarProjectLabel(projects: SidebarProject[], project: SidebarProject) {
  const norm = (s: string) => s.trim()
  const name = norm(project.name)
  const sameName = projects.filter((p) => norm(p.name) === name).length
  if (sameName <= 1) return project.name
  return `${project.name} · ${project.id.slice(0, 6)}`
}

const navIcons = {
  Dashboard: Home,
  Tasks: CheckSquare,
  Calendar: Calendar,
  Team: Users,
  'Reports & Analytics': BarChart3,
  Accounts: UserCog,
  Projects: FolderOpen,
} as const

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
]

const SIDEBAR_PROJECT_LIMIT = 4

export function DashboardSidebar({
  role = 'team_member',
  isCollapsed = false,
  onToggle,
  projects = [],
  serverOrganizationName = null,
}: {
  role?: UserRole
  isCollapsed?: boolean
  onToggle?: () => void
  projects?: SidebarProject[]
  serverOrganizationName?: string | null
}) {
  const pathname = usePathname()
  const [isProjectsOpen, setIsProjectsOpen] = useState(true)
  const { name: clientOrganizationName } = useOrganizationName()
  const organizationName = serverOrganizationName ?? clientOrganizationName

  const navItems = getDashboardNavItems(role).map((item) => ({
    ...item,
    icon: navIcons[item.name as keyof typeof navIcons] ?? Home,
  }))
  const showProjectsSection = true
  const isMemberProjectsEmpty = role === 'team_member' && projects.length === 0

  const showMemberProjectsPanel = role === 'team_member' && !isCollapsed

  return (
    <div
      className={`h-full border-r flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}
      style={{ backgroundColor: 'var(--theme-sidebar)', borderRightColor: 'var(--theme-border)' }}
    >
      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = item.name === 'Dashboard'
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border-r-2 border-[var(--theme-primary)]'
                  : 'text-[color:var(--theme-muted-foreground)] hover:bg-black/5 hover:text-[var(--theme-primary)]',
                isCollapsed ? 'justify-center' : ''
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}

        {/* Quick links to assigned projects (members) or org projects (admins) */}
        {showMemberProjectsPanel && showProjectsSection && (
          <div className="mt-6">
            <button
              onClick={() => setIsProjectsOpen(!isProjectsOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors hover:text-[color:var(--theme-foreground)]"
              style={{ color: 'var(--theme-muted-foreground)' }}
            >
              <span>Assigned projects</span>
              {isProjectsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {isProjectsOpen && (
              <div className="mt-2 space-y-1">
                {isMemberProjectsEmpty ? (
                  <div
                    className="ml-3 mr-1 rounded-lg border border-dashed px-3 py-3"
                    style={{ borderColor: 'var(--theme-border)' }}
                  >
                    <p className="text-xs font-medium" style={{ color: 'var(--theme-foreground)' }}>
                      No projects assigned
                    </p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--theme-muted-foreground)' }}>
                      When an admin adds you to a project, it will appear here.
                    </p>
                  </div>
                ) : null}
                {projects.slice(0, SIDEBAR_PROJECT_LIMIT).map((project) => {
                  const projectHref = `/dashboard/projects/${project.id}`
                  const isActive = pathname === projectHref
                  return (
                    <Link
                      key={project.id}
                      href={projectHref}
                      title={sidebarProjectLabel(projects, project)}
                      className={cn(
                        'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ml-3',
                        isActive
                          ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border-r-2 border-[var(--theme-primary)]'
                          : 'text-[color:var(--theme-muted-foreground)] hover:bg-black/5 hover:text-[var(--theme-primary)]'
                      )}
                    >
                      <FolderOpen className="mr-3 h-4 w-4" />
                      <span className="truncate">{sidebarProjectLabel(projects, project)}</span>
                    </Link>
                  )
                })}
                {!isMemberProjectsEmpty && projects.length > SIDEBAR_PROJECT_LIMIT ? (
                  <Link
                    href="/dashboard/projects"
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ml-3 text-[color:var(--theme-muted-foreground)] hover:bg-black/5 hover:text-[var(--theme-primary)]"
                  >
                    <FolderOpen className="mr-3 h-4 w-4" />
                    <span>View all assigned</span>
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Admin: collapsible org project shortcuts */}
        {role === 'tenant_admin' && !isCollapsed && showProjectsSection && (
          <div className="mt-6">
            <button
              onClick={() => setIsProjectsOpen(!isProjectsOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors hover:text-[color:var(--theme-foreground)]"
              style={{ color: 'var(--theme-muted-foreground)' }}
            >
              <span>Recent projects</span>
              {isProjectsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {isProjectsOpen && (
              <div className="mt-2 space-y-1">
                {projects.slice(0, SIDEBAR_PROJECT_LIMIT).map((project) => {
                  const projectHref = `/dashboard/projects/${project.id}`
                  const isActive = pathname === projectHref
                  return (
                    <Link
                      key={project.id}
                      href={projectHref}
                      title={sidebarProjectLabel(projects, project)}
                      className={cn(
                        'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ml-3',
                        isActive
                          ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border-r-2 border-[var(--theme-primary)]'
                          : 'text-[color:var(--theme-muted-foreground)] hover:bg-black/5 hover:text-[var(--theme-primary)]'
                      )}
                    >
                      <FolderOpen className="mr-3 h-4 w-4" />
                      <span className="truncate">{sidebarProjectLabel(projects, project)}</span>
                    </Link>
                  )
                })}
                <Link
                  href="/dashboard/projects"
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ml-3 text-[color:var(--theme-muted-foreground)] hover:bg-black/5 hover:text-[var(--theme-primary)]"
                >
                  <FolderOpen className="mr-3 h-4 w-4" />
                  <span>View all projects</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Bottom Navigation */}
      <div className={`px-2 py-4 border-t ${isCollapsed ? '' : 'px-4'}`} style={{ borderTopColor: 'var(--theme-border)' }}>
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border-r-2 border-[var(--theme-primary)]'
                  : 'text-[color:var(--theme-muted-foreground)] hover:bg-black/5 hover:text-[var(--theme-primary)]',
                isCollapsed ? 'justify-center' : ''
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </div>

      {/* Workspace/Organization Selector - Hide when collapsed */}
      {!isCollapsed && (
        <div className="px-4 py-4 border-t" style={{ borderTopColor: 'var(--theme-border)' }}>
          <div className="flex items-center px-3 py-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: 'var(--theme-primary)' }}>
              <span className="text-white font-bold text-sm">DF</span>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--theme-foreground)' }}>
                {organizationName || 'No organization'}
              </p>
              <p className="text-xs" style={{ color: 'var(--theme-muted-foreground)' }}>Workspace</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}