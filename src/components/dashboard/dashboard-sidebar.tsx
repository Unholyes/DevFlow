'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Calendar,
  CheckSquare,
  Home,
  Settings,
  Users,
  FolderOpen,
  TrendingUp,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Mock projects for demo
const mockProjects = [
  { id: '1', name: 'E-commerce Platform' },
  { id: '2', name: 'Mobile App Redesign' },
  { id: '3', name: 'API Migration' },
]

const navigation = [
  { name: 'Dashboard', href: '/dashboard-demo', icon: Home },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Reports', href: '/reports', icon: TrendingUp },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
]

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [isProjectsOpen, setIsProjectsOpen] = useState(true)

  return (
    <div className="bg-white w-64 min-h-screen border-r border-gray-200 flex flex-col">
      {/* Navigation */}
      <nav className="flex-2 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}

        {/* Projects Section */}
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
              {mockProjects.map((project) => {
                const projectHref = `/dashboard/projects/${project.id}`
                const isActive = pathname === projectHref
                return (
                  <Link
                    key={project.id}
                    href={projectHref}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ml-3',
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <FolderOpen className="mr-3 h-4 w-4" />
                    <span className="truncate">{project.name}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="px-4 py-4 border-t border-gray-200">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </div>

      {/* Workspace/Organization Selector */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center px-3 py-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-bold text-sm">DF</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">DevFlow Team</p>
            <p className="text-xs text-gray-500">Workspace</p>
          </div>
        </div>
      </div>
    </div>
  )
}