import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { userCanManageOrganizationRoles } from '@/lib/permissions/can-manage-organization-roles'

const DEFAULT_ROLE_NAMES = new Set(['Admin', 'Project Manager', 'Member'])

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
  if (body.target !== 'default' && body.target !== 'custom') {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
  }
  if (!isStringArray(body.permissions)) {
    return NextResponse.json({ error: 'permissions must be a string array' }, { status: 400 })
  }

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

  if (body.target === 'default') {
    if (typeof body.role !== 'string' || !DEFAULT_ROLE_NAMES.has(body.role)) {
      return NextResponse.json({ error: 'Invalid default role' }, { status: 400 })
    }
    if (body.role === 'Admin') {
      return NextResponse.json({ error: 'Admin role always has all permissions' }, { status: 400 })
    }

    // Upsert so we always persist even if the row was missing; plain .update() can affect 0 rows silently.
    const { data, error } = await admin
      .from('organization_default_roles')
      .upsert(
        {
          organization_id: organizationId,
          role: body.role,
          permissions: body.permissions,
        },
        { onConflict: 'organization_id,role' },
      )
      .select('role,permissions')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data?.length) {
      return NextResponse.json(
        {
          error:
            'Could not save default role permissions (no row returned). Verify SUPABASE_SERVICE_ROLE_KEY and the organization_default_roles unique key on (organization_id, role).',
        },
        { status: 500 },
      )
    }
    return NextResponse.json({ ok: true } satisfies { ok: true })
  }

  if (typeof body.roleId !== 'string' || body.roleId.length === 0) {
    return NextResponse.json({ error: 'Missing roleId' }, { status: 400 })
  }

  const { data: customData, error: customError } = await admin
    .from('organization_roles')
    .update({ permissions: body.permissions })
    .eq('id', body.roleId)
    .eq('organization_id', organizationId)
    .select('id')

  if (customError) {
    return NextResponse.json({ error: customError.message }, { status: 500 })
  }
  if (!customData?.length) {
    return NextResponse.json({ error: 'Custom role not found for this organization.' }, { status: 404 })
  }

  return NextResponse.json({ ok: true } satisfies { ok: true })
}
