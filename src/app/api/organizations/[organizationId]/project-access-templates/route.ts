import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { userCanManageOrganizationRoles } from '@/lib/permissions/can-manage-organization-roles'
import { filterToProjectTemplatePermissions } from '@/lib/permissions/project-template-permissions'

const LEVELS = new Set(['Admin', 'Editor', 'Viewer'])

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await context.params

  if (!organizationId) {
    return NextResponse.json({ error: 'Missing organization id' }, { status: 400 })
  }

  let parsed: unknown
  try {
    parsed = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!parsed || typeof parsed !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const body = parsed as Record<string, unknown>
  const accessLevel = typeof body.accessLevel === 'string' ? body.accessLevel : ''
  if (!LEVELS.has(accessLevel)) {
    return NextResponse.json({ error: 'Invalid accessLevel' }, { status: 400 })
  }

  if (!isStringArray(body.permissions)) {
    return NextResponse.json({ error: 'permissions must be a string array' }, { status: 400 })
  }

  const permissions = filterToProjectTemplatePermissions(body.permissions)

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const allowed = await userCanManageOrganizationRoles(admin, user.id, organizationId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('organization_project_access_templates')
    .upsert(
      {
        organization_id: organizationId,
        access_level: accessLevel,
        permissions,
      },
      { onConflict: 'organization_id,access_level' },
    )
    .select('access_level,permissions')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data?.length) {
    return NextResponse.json({ error: 'Could not save project access template.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true } satisfies { ok: true })
}
