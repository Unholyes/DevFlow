import { createClient } from '@/lib/supabase/server'
import { TENANT_SLUG_HEADER } from '@/lib/tenant/resolve'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', org.id)
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching sprint:', error)
    return NextResponse.json({ error: 'Failed to fetch sprint' }, { status: 500 })
  }
}
