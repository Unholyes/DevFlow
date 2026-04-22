import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const sprintId = searchParams.get('sprintId')

  try {
    let query = supabase
      .from('tasks')
      .select('*')

    // Skip project_id filter if it's not a valid UUID (for development with mock data)
    if (projectId && projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      query = query.eq('project_id', projectId)
    }

    if (sprintId) {
      query = query.eq('sprint_id', sprintId)
    } else {
      // If no sprint specified, get backlog tasks (no sprint assigned)
      query = query.is('sprint_id', null)
    }

    const { data, error } = await query.order('position', { ascending: true })

    if (error) {
      console.error('Supabase error:', error);
      // Return empty array on RLS error instead of crashing
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    // Return empty array on any error
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  const supabase = createClient()
  
  try {
    const body = await request.json();
    const { 
      project_id, 
      title, 
      description, 
      priority, 
      story_points = 0,
      due_date,
      assignee_id,
      workflow_stage_id,
      sprint_id
    } = body;

    // Skip project_id if it's not a valid UUID (for development)
    const validProjectId = project_id && project_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? project_id : null;

    // Get the highest position for ordering
    let newPosition = 0;
    if (validProjectId) {
      const { data: maxPosition } = await supabase
        .from('tasks')
        .select('position')
        .eq('project_id', validProjectId)
        .order('position', { ascending: false })
        .limit(1)
        .single();
      newPosition = (maxPosition?.position ?? -1) + 1;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...(validProjectId && { project_id: validProjectId }),
        title,
        description,
        priority,
        story_points,
        due_date,
        assignee_id,
        workflow_stage_id,
        sprint_id,
        position: newPosition,
        // Temporarily skip created_by_id to avoid RLS recursion
        // created_by_id: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Failed to create task', data: null }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  
  try {
    const body = await request.json()
    const { id, ...updates } = body

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('id')

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
  }

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
