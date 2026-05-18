import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { ReportsAnalyticsContent } from '@/components/dashboard/reports-analytics-content'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { loadBlockedTasksForOrg } from '@/lib/reports/load-blocked-tasks'
import { loadReportsScope } from '@/lib/reports/load-reports-scope'

export const metadata: Metadata = {
  title: 'Reports & Analytics | DevFlow',
  description:
    'Analyze team performance, workloads, sprint burndown, task status, and recent activity across your workspace.',
}

export default async function ReportsAnalyticsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const tenantSlug = getTenantSlug()
  const orgId = tenantSlug
    ? (await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()).data?.id ?? null
    : await resolvePrimaryOrgIdForUser(supabase as any, user.id)

  const [scope, blockedTasks] = orgId
    ? await Promise.all([
        loadReportsScope(supabase as any, orgId),
        loadBlockedTasksForOrg(supabase as any, orgId),
      ])
    : [
        { projects: [], tasks: [], stagesById: {}, processMetaById: {}, assigneeNames: {} },
        [] as Awaited<ReturnType<typeof loadBlockedTasksForOrg>>,
      ]

  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto py-10 text-sm text-gray-500">Loading reports…</div>
      }
    >
      <ReportsAnalyticsContent scope={scope} blockedTasks={blockedTasks} />
    </Suspense>
  )
}
