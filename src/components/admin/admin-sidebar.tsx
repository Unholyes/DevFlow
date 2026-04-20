'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  Shield,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

const navigation = [
  { name: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
  { name: 'Tenants', href: '/super-admin/tenants', icon: Building2 },
  { name: 'Applications', href: '/super-admin/applications', icon: FileText },
  { name: 'Overview', href: '/super-admin/overview', icon: BarChart3 },
]

const bottomNavigation = [
  { name: 'Settings', href: '/super-admin/settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <div className="bg-white w-64 min-h-screen border-r border-gray-200 flex flex-col">
      {/* Logo/Brand */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">DevFlow</p>
            <p className="text-xs text-purple-600 font-medium">Super Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
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
                  ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-4 py-4 border-t border-gray-200">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-red-600 hover:bg-red-50 mt-2 w-full"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </button>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center px-3 py-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-bold text-sm">SA</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Super Admin</p>
            <p className="text-xs text-gray-500">Platform Owner</p>
          </div>
        </div>
      </div>
    </div>
  )
}
