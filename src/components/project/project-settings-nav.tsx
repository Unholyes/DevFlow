'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function ProjectSettingsNav({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const base = `/dashboard/projects/${projectId}/settings`
  const tabs = [
    { href: base, label: 'General', match: (path: string) => path === base },
    {
      href: `${base}/team-roles`,
      label: 'Team roles',
      match: (path: string) => path.startsWith(`${base}/team-roles`),
    },
  ]

  return (
    <nav className="flex gap-1 border-b border-gray-200" aria-label="Project settings">
      {tabs.map((tab) => {
        const active = tab.match(pathname)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-[#7a2233] text-[#7a2233]'
                : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
