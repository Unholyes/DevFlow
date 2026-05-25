'use client'

import { ReactNode, useState } from 'react'
import { DashboardHeader } from './dashboard-header'
import { DashboardSidebar, type SidebarProject } from './dashboard-sidebar'
import { DashboardRouteGuard } from './dashboard-route-guard'
import type { UserRole } from '@/types'

export type ServerUserInfo = {
  fullName: string
  email: string
  avatarUrl: string | null
}

interface DashboardLayoutProps {
  children: ReactNode
  role?: UserRole
  sidebarProjects?: SidebarProject[]
  memberProjectIds?: string[]
  userInfo?: ServerUserInfo | null
  organizationName?: string | null
  organizationIcon?: string | null
}

export function DashboardLayout({
  children,
  role = 'team_member',
  sidebarProjects = [],
  memberProjectIds = [],
  userInfo = null,
  organizationName = null,
  organizationIcon = null,
}: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--theme-background)] text-[var(--theme-foreground)]">
      <DashboardRouteGuard role={role} memberProjectIds={memberProjectIds} />
      <div className="fixed top-0 left-0 right-0 z-50">
        <DashboardHeader
          role={role}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          serverUserInfo={userInfo}
          serverOrganizationName={organizationName}
          serverOrganizationIcon={organizationIcon}
        />
      </div>

      <div className="flex pt-16">
        <div
          className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] transition-all duration-300 overflow-hidden ${isSidebarCollapsed ? 'w-16' : 'w-64'}`}
        >
          <DashboardSidebar
            role={role}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            projects={sidebarProjects}
            serverOrganizationName={organizationName}
          />
        </div>

        <main
          className={`themed-workspace min-w-0 flex-1 overflow-x-hidden p-6 pt-8 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
