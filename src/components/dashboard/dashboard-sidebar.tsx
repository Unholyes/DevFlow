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

export type SidebarProject = { id: string; name: string }

function sidebarProjectLabel(projects: SidebarProject[], project: SidebarProject) {
  const norm = (s: string) => s.trim()
  const name = norm(project.name)
  const sameName = projects.filter((p) => norm(p.name) === name).length
  if (sameName <= 1) return project.name
  return `${project.name} · ${project.id.slice(0, 6)}`
}

const tenantMemberNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Reports & Analytics', href: '/dashboard/reports', icon: BarChart3 },
]

const tenantAdminNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Accounts', href: '/dashboard/accounts', icon: UserCog },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderOpen },
  { name: 'Reports & Analytics', href: '/dashboard/reports', icon: BarChart3 },
]

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

  const navItems = role === 'tenant_admin' ? tenantAdminNavigation : tenantMemberNavigation

  return (
    <div className={`bg-white min-h-screen border-r border-gray-200 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`} style={{ borderRightColor: 'var(--theme-secondary)' }}>
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
                  : 'text-gray-600 hover:bg-[var(--theme-primary)]/5 hover:text-[var(--theme-primary)]',
                isCollapsed ? 'justify-center' : ''
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}

        {/* Projects Section - Hide when collapsed */}
        {!isCollapsed && (
          <div className="mt-8">
            <button
              onClick={() => setIsProjectsOpen(!isProjectsOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
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
                          : 'text-gray-600 hover:bg-[var(--theme-primary)]/5 hover:text-[var(--theme-primary)]'
                      )}
                    >
                      <FolderOpen className="mr-3 h-4 w-4" />
                      <span className="truncate">{sidebarProjectLabel(projects, project)}</span>
                    </Link>
                  )
                })}
                <Link
                  href="/dashboard/projects"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-[var(--theme-primary)]/5 hover:text-[var(--theme-primary)] rounded-lg transition-colors ml-3"
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
      <div className={`px-2 py-4 border-t border-gray-200 ${isCollapsed ? '' : 'px-4'}`}>
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
                  : 'text-gray-600 hover:bg-[var(--theme-primary)]/5 hover:text-[var(--theme-primary)]',
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
        <div className="px-4 py-4 border-t border-gray-200" style={{ borderTopColor: 'var(--theme-secondary)' }}>
          <div className="flex items-center px-3 py-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: 'var(--theme-primary)' }}>
              <span className="text-white font-bold text-sm">DF</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {organizationName || 'No organization'}
              </p>
              <p className="text-xs text-gray-500">Workspace</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}