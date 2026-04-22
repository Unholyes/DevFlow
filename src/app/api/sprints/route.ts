import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  try {
    let query = supabase
      .from('sprints')
      .select('*')

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching sprints:', error)
    return NextResponse.json({ error: 'Failed to fetch sprints' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createClient()
  
  try {
    const body = await request.json()
    const { 
      project_id, 
      phase_id,
      name, 
      start_date, 
      end_date,
      story_points_total = 0
    } = body

    const { data, error } = await supabase
      .from('sprints')
      .insert({
        project_id,
        phase_id,
        name,
        start_date,
        end_date,
        story_points_total,
        status: 'planned',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error creating sprint:', error)
    return NextResponse.json({ error: 'Failed to create sprint' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  
  try {
    const body = await request.json()
    const { id, ...updates } = body

    const { data, error } = await supabase
      .from('sprints')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating sprint:', error)
    return NextResponse.json({ error: 'Failed to update sprint' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const sprintId = searchParams.get('id')

  if (!sprintId) {
    return NextResponse.json({ error: 'Sprint ID is required' }, { status: 400 })
  }

  try {
    const { error } = await supabase
      .from('sprints')
      .delete()
      .eq('id', sprintId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sprint:', error)
    return NextResponse.json({ error: 'Failed to delete sprint' }, { status: 500 })
  }
}
