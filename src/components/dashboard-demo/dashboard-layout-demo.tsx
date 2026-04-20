import { ReactNode } from 'react'
import { DashboardHeader } from './dashboard-header-demo'
import { DashboardSidebar } from './dashboard-sidebar-demo'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayoutDemo({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <DashboardHeader />
      </div>

      {/* Fixed Sidebar and Main Content */}
      <div className="flex pt-16"> {/* pt-16 to account for fixed header height */}
        <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] z-40"> {/* top-16 for header, z-40 below header */}
          <DashboardSidebar />
        </div>

        <main className="flex-1 ml-64 p-6 pt-8"> {/* ml-64 for sidebar width, pt-8 for spacing */}
          {children}
        </main>
      </div>
    </div>
  )
}