import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { getTenantSlug } from '@/lib/tenant/server'

type SearchSuggestion = {
  id: string
  label: string
  href: string
  type: 'project' | 'feature'
  description?: string
}

const FEATURE_SUGGESTIONS: SearchSuggestion[] = [
  { id: 'feature-dashboard', label: 'Dashboard', href: '/dashboard', type: 'feature', description: 'Go to dashboard home' },
  { id: 'feature-projects', label: 'Projects', href: '/dashboard/projects', type: 'feature', description: 'Browse all projects' },
  { id: 'feature-tasks', label: 'Tasks', href: '/dashboard/tasks', type: 'feature', description: 'Manage team tasks' },
  { id: 'feature-calendar', label: 'Calendar', href: '/dashboard/calendar', type: 'feature', description: 'View calendar schedule' },
  { id: 'feature-team', label: 'Team', href: '/dashboard/team', type: 'feature', description: 'View team members' },
  { id: 'feature-reports', label: 'Reports & Analytics', href: '/dashboard/reports', type: 'feature', description: 'View reports and analytics' },
  { id: 'feature-settings', label: 'Settings', href: '/settings', type: 'feature', description: 'Open settings home' },
  { id: 'feature-manage-profile', label: 'Manage Profile', href: '/settings/profile', type: 'feature', description: 'Update profile details' },
  { id: 'feature-organization-settings', label: 'Organization Settings', href: '/settings/organization', type: 'feature', description: 'Manage organization details' },
  { id: 'feature-permissions', label: 'Permissions', href: '/settings/permissions', type: 'feature', description: 'Review team permissions' },
]

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
      return NextResponse.json({ suggestions: [] as SearchSuggestion[] })
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = await resolveOrgId(supabase, user.id)
    const normalizedQuery = query.toLowerCase()

    const featureMatches = FEATURE_SUGGESTIONS.filter((item) => {
      const haystack = `${item.label} ${item.description ?? ''}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    }).slice(0, 6)

    let projectMatches: SearchSuggestion[] = []
    if (orgId) {
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
    }

    return NextResponse.json({
      suggestions: [...projectMatches, ...featureMatches].slice(0, 10),
    })
  } catch (error) {
    console.error('Error in /api/search/suggestions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
