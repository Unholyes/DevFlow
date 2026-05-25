import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolveWorkspaceContext } from '@/lib/auth/resolve-workspace-role'
import {
  getSearchSuggestionsForRole,
  type DashboardSearchSuggestion,
} from '@/lib/dashboard/dashboard-access'

export const dynamic = 'force-dynamic'

async function resolveOrgId(supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const tenantSlug = getTenantSlug()
  if (tenantSlug) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle()
    if (org?.id) return org.id
  }

  return resolvePrimaryOrgIdForUser(supabase as any, userId)
}

export async function GET(request: NextRequest) {
  try {
    const query = (request.nextUrl.searchParams.get('q') ?? '').trim()
    if (!query) {
      return NextResponse.json({ suggestions: [] as DashboardSearchSuggestion[] })
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ws = await resolveWorkspaceContext({ supabase: supabase as any, userId: user.id })
    const orgId = ws.organizationId ?? (await resolveOrgId(supabase, user.id))
    const normalizedQuery = query.toLowerCase()

    const featureMatches = getSearchSuggestionsForRole(ws.role).filter((item) => {
      const haystack = `${item.label} ${item.description ?? ''}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    }).slice(0, 6)

    let projectMatches: DashboardSearchSuggestion[] = []
    let taskMatches: DashboardSearchSuggestion[] = []

    if (orgId) {
      if (ws.role === 'tenant_admin') {
        const { data: projects } = await supabase
          .from('projects')
          .select('id,name,status')
          .eq('organization_id', orgId)
          .ilike('name', `%${query}%`)
          .order('name', { ascending: true })
          .limit(6)

        projectMatches = (projects ?? []).map((project) => ({
          id: `project-${project.id}`,
          label: project.name,
          href: `/dashboard/projects/${project.id}`,
          type: 'project',
          description: project.status ? `Project (${project.status})` : 'Project',
        }))
      } else {
        const { data: memberships } = await supabase
          .from('project_members')
          .select('project_id, projects:project_id ( id, name, status, organization_id )')
          .eq('user_id', user.id)

        projectMatches = (memberships ?? [])
          .flatMap((row) => {
            const joined = (row as {
              projects?:
                | { id: string; name: string; status?: string | null; organization_id?: string }
                | { id: string; name: string; status?: string | null; organization_id?: string }[]
                | null
            }).projects
            const project = Array.isArray(joined) ? joined[0] : joined
            if (!project?.id || project.organization_id !== orgId) return []
            if (!project.name.toLowerCase().includes(normalizedQuery)) return []
            return [
              {
                id: `project-${project.id}`,
                label: project.name,
                href: `/dashboard/projects/${project.id}`,
                type: 'project' as const,
                description: project.status ? `Project (${project.status})` : 'Project',
              },
            ]
          })
          .slice(0, 6)

        const { data: tasks } = await supabase
          .from('tasks')
          .select('id,title')
          .eq('organization_id', orgId)
          .eq('assignee_id', user.id)
          .ilike('title', `%${query}%`)
          .order('title', { ascending: true })
          .limit(6)

        taskMatches = (tasks ?? []).map((task) => ({
          id: `task-${task.id}`,
          label: task.title,
          href: `/dashboard/tasks?task=${task.id}`,
          type: 'task',
          description: 'Your task',
        }))
      }
    }

    return NextResponse.json({
      suggestions: [...taskMatches, ...projectMatches, ...featureMatches].slice(0, 10),
    })
  } catch (error) {
    console.error('Error in /api/search/suggestions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
