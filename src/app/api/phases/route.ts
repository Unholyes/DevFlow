import { createClient } from '@/lib/supabase/server'
import { getTenantSlugFromRequest, resolveWorkspaceOrgId } from '@/lib/api/resolve-workspace-org'
import { userCanApprovePhaseGates } from '@/lib/permissions/phase-gate-permissions'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const supabase = createClient()

  const jsonError = (status: number, code: string, message: string) =>
    NextResponse.json({ error: { code, message } }, { status })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return jsonError(401, 'UNAUTHORIZED', 'Unauthorized')
    }

    const orgId = await resolveWorkspaceOrgId(supabase, request)
    if (!orgId) {
      const tenantSlug = getTenantSlugFromRequest(request)
      return jsonError(
        400,
        tenantSlug ? 'TENANT_CONTEXT_INVALID' : 'TENANT_CONTEXT_MISSING',
        tenantSlug ? 'Invalid tenant context' : 'Missing tenant context'
      )
    }

    const body = await request.json()
    const { id, status } = body as { id: string; status: 'active' | 'completed' | 'archived' }

    if (!id) return jsonError(400, 'PHASE_ID_REQUIRED', 'Phase id is required')
    if (!status) return jsonError(400, 'STATUS_REQUIRED', 'Status is required')
    if (!['active', 'completed', 'archived'].includes(status)) {
      return jsonError(400, 'STATUS_INVALID', 'Status must be one of: active, completed, archived')
    }

    const updates: Record<string, unknown> = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()

    // Load phase to find project/order so we can activate the next phase.
    const { data: currentPhase, error: currentError } = await supabase
      .from('sdlc_phases')
      .select('id,project_id,order_index')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (currentError) throw currentError
    if (!currentPhase?.id) {
      return jsonError(404, 'PHASE_NOT_FOUND', 'Phase not found')
    }

    const projectId = String((currentPhase as { project_id?: unknown }).project_id ?? '')
    if (status === 'completed') {
      const allowed = await userCanApprovePhaseGates(supabase, {
        organizationId: orgId,
        userId: user.id,
        projectId,
      })
      if (!allowed) {
        return jsonError(
          403,
          'PHASE_GATE_FORBIDDEN',
          'You do not have permission to complete phases and advance gates',
        )
      }
    }

    const { data, error } = await supabase
      .from('sdlc_phases')
      .update(updates)
      .eq('id', currentPhase.id)
      .eq('organization_id', orgId)
      .select('id,status,completed_at')
      .single()

    if (error) throw error

    // If a phase is completed, make the next phase active (if it exists).
    if (status === 'completed') {
      await supabase
        .from('sdlc_phases')
        .update({ status: 'active' })
        .eq('organization_id', orgId)
        .eq('project_id', currentPhase.project_id)
        .eq('order_index', currentPhase.order_index + 1)
        .neq('status', 'completed')
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating phase:', error)
    return jsonError(500, 'PHASE_UPDATE_FAILED', 'Failed to update phase')
  }
}

