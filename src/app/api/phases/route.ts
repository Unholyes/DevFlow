import { createClient } from '@/lib/supabase/server'
import { TENANT_SLUG_HEADER } from '@/lib/tenant/resolve'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const supabase = createClient()

  try {
    const tenantSlug = request.headers.get(TENANT_SLUG_HEADER)
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle()

    if (orgError) throw orgError
    if (!org?.id) {
      return NextResponse.json({ error: 'Invalid tenant context' }, { status: 400 })
    }

    const body = await request.json()
    const { id, status } = body as { id: string; status: 'active' | 'completed' | 'archived' }

    if (!id) return NextResponse.json({ error: 'Phase id is required' }, { status: 400 })
    if (!status) return NextResponse.json({ error: 'Status is required' }, { status: 400 })

    const updates: Record<string, unknown> = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()

    // Load phase to find project/order so we can activate the next phase.
    const { data: currentPhase, error: currentError } = await supabase
      .from('sdlc_phases')
      .select('id,project_id,order_index')
      .eq('id', id)
      .eq('organization_id', org.id)
      .single()

    if (currentError) throw currentError

    const { data, error } = await supabase
      .from('sdlc_phases')
      .update(updates)
      .eq('id', currentPhase.id)
      .eq('organization_id', org.id)
      .select('id,status,completed_at')
      .single()

    if (error) throw error

    // If a phase is completed, make the next phase active (if it exists).
    if (status === 'completed') {
      await supabase
        .from('sdlc_phases')
        .update({ status: 'active' })
        .eq('organization_id', org.id)
        .eq('project_id', currentPhase.project_id)
        .eq('order_index', currentPhase.order_index + 1)
        .neq('status', 'completed')
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating phase:', error)
    return NextResponse.json({ error: 'Failed to update phase' }, { status: 500 })
  }
}

