import { ReactNode } from 'react'
import { AdminHeader } from './admin-header'
import { AdminSidebar } from './admin-sidebar'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <AdminHeader />
      </div>

      {/* Fixed Sidebar and Main Content */}
      <div className="flex pt-16">
        <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] z-40">
          <AdminSidebar />
        </div>

        <main className="flex-1 ml-64 p-6 pt-8">
          {children}
        </main>
      </div>
    </div>
  )
}
