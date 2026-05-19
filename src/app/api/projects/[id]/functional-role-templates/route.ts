import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadProjectFunctionalRolePermissionsMap } from '@/lib/permissions/project-functional-role-templates'
import { userCanManageProjectMembers } from '@/lib/permissions/project-members-permissions'
import {
  PROJECT_FUNCTIONAL_ROLES,
  filterToProjectTemplatePermissions,
  isFunctionalRoleId,
} from '@/lib/permissions/project-template-permissions'

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

async function loadProjectContext(supabase: ReturnType<typeof createClient>, projectId: string, userId: string) {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id,organization_id')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError) return { error: jsonError(500, projectError.message) }
  if (!project?.id || !project.organization_id) {
    return { error: jsonError(404, 'Project not found') }
  }

  const organizationId = String(project.organization_id)

  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (memberError) return { error: jsonError(500, memberError.message) }
  if (!membership?.id) return { error: jsonError(403, 'Forbidden') }

  return { projectId: project.id as string, organizationId }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await context.params
  if (!projectId) return jsonError(400, 'Missing project id')

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return jsonError(401, 'Unauthorized')

  const ctx = await loadProjectContext(supabase, projectId, user.id)
  if ('error' in ctx) return ctx.error

  const functionalRolePermissions = await loadProjectFunctionalRolePermissionsMap(supabase, ctx.projectId)

  return NextResponse.json({
    functionalRoles: PROJECT_FUNCTIONAL_ROLES,
    functionalRolePermissions,
  })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await context.params
  if (!projectId) return jsonError(400, 'Missing project id')

  let parsed: unknown
  try {
    parsed = await request.json()
  } catch {
    return jsonError(400, 'Invalid JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    return jsonError(400, 'Invalid body')
  }

  const body = parsed as Record<string, unknown>
  const functionalRole = typeof body.functionalRole === 'string' ? body.functionalRole.trim() : ''
  if (!isFunctionalRoleId(functionalRole)) {
    return jsonError(400, 'Invalid functionalRole')
  }

  if (!Array.isArray(body.permissions) || !body.permissions.every((x) => typeof x === 'string')) {
    return jsonError(400, 'permissions must be a string array')
  }

  const permissions = filterToProjectTemplatePermissions(body.permissions)

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return jsonError(401, 'Unauthorized')

  const ctx = await loadProjectContext(supabase, projectId, user.id)
  if ('error' in ctx) return ctx.error

  const canManage = await userCanManageProjectMembers(supabase, {
    organizationId: ctx.organizationId,
    userId: user.id,
    projectId: ctx.projectId,
  })
  if (!canManage) return jsonError(403, 'Forbidden')

  const admin = createAdminClient()
  const { error } = await admin.from('project_functional_role_templates').upsert(
    {
      project_id: ctx.projectId,
      functional_role: functionalRole,
      permissions,
    },
    { onConflict: 'project_id,functional_role' },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true } satisfies { ok: true })
}
