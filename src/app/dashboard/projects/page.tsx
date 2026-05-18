import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FolderKanban, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { Button } from '@/components/ui/button'
import { computeProjectProgressByIds } from '@/lib/projects/compute-project-progress'

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, ' ')
}

function permissionListHas(perms: unknown, id: string) {
  if (!Array.isArray(perms)) return false
  const target = id.toLowerCase()
  return perms.some((p) => typeof p === 'string' && p.toLowerCase() === target)
}

export default async function ProjectsPage() {
  const tenantSlug = getTenantSlug()
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const orgId = tenantSlug
    ? (
        await supabase
          .from('organizations')
          .select('id')
          .eq('slug', tenantSlug)
          .maybeSingle()
      ).data?.id ?? null
    : await resolvePrimaryOrgIdForUser(supabase as any, user.id)

  if (!orgId) redirect('/onboarding')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('system_role,custom_roles')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  const systemRole = String((membership as any)?.system_role ?? 'Member')
  const assignedCustomRoles: string[] = Array.isArray((membership as any)?.custom_roles)
    ? (((membership as any).custom_roles as unknown[]).filter((x) => typeof x === 'string' && x.trim().length > 0) as string[])
    : []

  const [{ data: defaultRoleRow }, { data: customRoleRows }] = await Promise.all([
    supabase
      .from('organization_default_roles')
      .select('permissions')
      .eq('organization_id', orgId)
      .eq('role', systemRole)
      .maybeSingle(),
    supabase.from('organization_roles').select('name,permissions').eq('organization_id', orgId),
  ])

  const customByNameLower = new Map<string, unknown>()
  for (const r of (customRoleRows ?? []) as any[]) {
    const nameLower = normalizeName(String(r?.name ?? '')).toLowerCase()
    if (!nameLower) continue
    customByNameLower.set(nameLower, r?.permissions)
  }

  const canCreateProject =
    systemRole === 'Owner' ||
    permissionListHas((defaultRoleRow as any)?.permissions, 'pm.projects.create') ||
    assignedCustomRoles.some((name) => permissionListHas(customByNameLower.get(normalizeName(name).toLowerCase()), 'pm.projects.create'))

  const { data: projects } = await supabase
    .from('projects')
    .select('id,name,description,status,created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  const projectList = projects ?? []
  const progressByProjectId = await computeProjectProgressByIds(
    supabase,
    orgId,
    projectList.map((p) => ({ id: p.id, status: p.status }))
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="mt-2 text-gray-600">Manage and track all your projects</p>
        </div>
        {canCreateProject ? (
          <Button asChild>
            <Link href="/dashboard/projects/new">Create Project</Link>
          </Button>
        ) : null}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projectList.map((project) => {
          const agg = progressByProjectId.get(project.id) ?? {
            progress: 0,
            tasksCount: 0,
            completedTasks: 0,
          }
          return (
          <Link
            key={project.id}
            href={`/dashboard/projects/${project.id}`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FolderKanban className="h-6 w-6 text-purple-600" />
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                project.status === 'active' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {project.status}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium text-gray-900">{agg.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${agg.progress}%` }}
                  />
                </div>
                {agg.tasksCount > 0 ? (
                  <p className="mt-1.5 text-xs text-gray-500 tabular-nums">
                    {agg.completedTasks}/{agg.tasksCount} tasks completed
                  </p>
                ) : null}
              </div>

              <div className="flex items-center text-sm text-gray-600 pt-2 border-t border-gray-100">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </Link>
          )
        })}
      </div>
    </div>
  )
}