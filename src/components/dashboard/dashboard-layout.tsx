'use client'

import { ReactNode, useState } from 'react'
import { DashboardHeader } from './dashboard-header'
import { DashboardSidebar } from './dashboard-sidebar'
import type { UserRole } from '@/types'

interface DashboardLayoutProps {
  children: ReactNode
  role?: UserRole
}

export function DashboardLayout({ children, role = 'team_member' }: DashboardLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <DashboardHeader 
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Fixed Sidebar and Main Content */}
      <div className="flex pt-16">
        <div className={`fixed left-0 top-16 h-[calc(100vh-4rem)] z-40 transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <DashboardSidebar 
            role={role} 
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        <main className={`flex-1 p-6 pt-8 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          {children}
        </main>
      </div>
    </div>
  )
}