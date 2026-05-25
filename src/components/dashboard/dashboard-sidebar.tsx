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
}: {
  role?: UserRole
  isCollapsed?: boolean
  onToggle?: () => void
  projects?: SidebarProject[]
}) {
  const pathname = usePathname()
  const [isProjectsOpen, setIsProjectsOpen] = useState(true)
  const { name: organizationName } = useOrganizationName()

  const navItems = getDashboardNavItems(role).map((item) => ({
    ...item,
    icon: navIcons[item.name as keyof typeof navIcons] ?? Home,
  }))
  const showProjectsSection = role === 'tenant_admin' || projects.length > 0

  return (
    <div
      className={`min-h-screen border-r flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}
      style={{ backgroundColor: 'var(--theme-sidebar)', borderRightColor: 'var(--theme-border)' }}
    >
      {/* Navigation */}
      <nav className="flex-1 px-2 py-6 space-y-2">
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

        {/* Projects Section - admins always; members only when they have project access */}
        {!isCollapsed && showProjectsSection && (
          <div className="mt-8">
            <button
              onClick={() => setIsProjectsOpen(!isProjectsOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors hover:text-[color:var(--theme-foreground)]"
              style={{ color: 'var(--theme-muted-foreground)' }}
            >
              <span>Projects</span>
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
                {role === 'tenant_admin' && (
                  <Link
                    href="/dashboard/projects"
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ml-3 text-[color:var(--theme-muted-foreground)] hover:bg-black/5 hover:text-[var(--theme-primary)]"
                  >
                    <FolderOpen className="mr-3 h-4 w-4" />
                    <span>View all projects</span>
                  </Link>
                )}
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