import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching sprint:', error)
    return NextResponse.json({ error: 'Failed to fetch sprint' }, { status: 500 })
  }
}
