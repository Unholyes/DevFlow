'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { UserRole } from '@/types'
import { canAccessDashboardPath, extractProjectIdFromPath } from '@/lib/dashboard/dashboard-access'

type DashboardRouteGuardProps = {
  role: UserRole
  memberProjectIds?: string[]
}

export function DashboardRouteGuard({ role, memberProjectIds = [] }: DashboardRouteGuardProps) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!pathname) return

    if (!canAccessDashboardPath(role, pathname)) {
      router.replace('/dashboard')
      return
    }

    if (role === 'team_member') {
      const projectId = extractProjectIdFromPath(pathname)
      if (projectId && !memberProjectIds.includes(projectId)) {
        router.replace('/dashboard')
      }
    }
  }, [pathname, role, memberProjectIds, router])

  return null
}
