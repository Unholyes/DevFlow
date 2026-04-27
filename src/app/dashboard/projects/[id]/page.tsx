import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ProjectHeader } from '@/components/project/project-header'
import { ProjectStats } from '@/components/project/project-stats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, Circle, ArrowRight, ArrowLeft, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'

const sdlcBadgeColors = {
  Scrum: 'bg-blue-100 text-blue-700 border-blue-200',
  Kanban: 'bg-orange-100 text-orange-700 border-orange-200',
};

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const tenantSlug = getTenantSlug()
  if (!tenantSlug) redirect('/onboarding')

  const supabase = createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', tenantSlug)
    .maybeSingle()

  if (!org?.id) redirect('/onboarding')

  const { data: project } = await supabase
    .from('projects')
    .select('id,name,description,status,progress_percent,phase_gating_enabled')
    .eq('id', params.id)
    .eq('organization_id', org.id)
    .maybeSingle()

  if (!project) notFound()

  const { data: phases } = await supabase
    .from('sdlc_phases')
    .select('id,title,methodology,status,order_index,is_gated')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true })

  const mappedPhases = (phases ?? []).map((p) => {
    const sdlcType = p.methodology === 'scrum' ? 'Scrum' : 'Kanban'
    return {
      id: p.id,
      name: p.title,
      sdlcType,
      dbStatus: p.status as 'active' | 'completed' | 'archived',
      isGated: p.is_gated,
    }
  })

  const isPhaseLocked = (phaseIndex: number) => {
    if (!project.phase_gating_enabled) return false
    const phase = mappedPhases?.[phaseIndex]
    if (!phase?.isGated) return false
    if (phaseIndex === 0) return false
    const prev = mappedPhases?.[phaseIndex - 1]
    return prev?.dbStatus !== 'completed'
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link 
        href="/dashboard/projects"
        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Projects
      </Link>

      <ProjectHeader
        project={{
          id: project.id,
          name: project.name,
          description: project.description ?? '',
          // MVP: treat project-level methodology as a display label; hybrid is modeled per-phase.
          sdlcMethodology: 'kanban',
          status: project.status,
          progress: project.progress_percent ?? 0,
          tasksCount: 0,
          completedTasks: 0,
          dueDate: new Date(),
          teamMembers: 0,
        }}
      />
      <ProjectStats
        project={{
          id: project.id,
          name: project.name,
          description: project.description ?? '',
          sdlcMethodology: 'kanban',
          status: project.status,
          progress: project.progress_percent ?? 0,
          tasksCount: 0,
          completedTasks: 0,
          dueDate: new Date(),
          teamMembers: 0,
        }}
      />

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">Project Phases Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mappedPhases.map((phase, index) => {
              const locked = isPhaseLocked(index)
              const isCompleted = phase.dbStatus === 'completed'
              const isInProgress = !locked && !isCompleted
              const statusLabel = locked ? 'Locked' : isCompleted ? 'Completed' : 'Active'
              const progress = isCompleted ? 100 : locked ? 0 : 50

              const statusBg = isCompleted 
                ? 'bg-green-50 border-green-200' 
                : isInProgress 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-gray-50 border-gray-200';
              
              const statusTextColor = isCompleted 
                ? 'text-green-700' 
                : isInProgress 
                  ? 'text-blue-700' 
                  : 'text-gray-500';
              
              const progressColor = isCompleted 
                ? 'bg-green-500' 
                : isInProgress 
                  ? 'bg-blue-600' 
                  : 'bg-gray-300';

              const StatusIcon = isCompleted ? CheckCircle2 : isInProgress ? Clock : Circle;

              return (
                <div
                  key={phase.id}
                  onClick={() => {
                    if (locked) return
                  }}
                  className={`group relative p-4 rounded-lg border-2 transition-all ${locked ? 'cursor-not-allowed opacity-70' : 'hover:shadow-md hover:border-blue-300'} ${statusBg}`}
                >
                  {!locked ? (
                    <Link href={`/dashboard/projects/${project.id}/phases/${phase.id}`} className="absolute inset-0 rounded-lg" aria-label={`Open phase ${phase.name}`} />
                  ) : null}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <StatusIcon className={`h-5 w-5 flex-shrink-0 ${statusTextColor}`} />
                      <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">{phase.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {locked && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-2 py-1 rounded">
                          <Lock className="h-3 w-3" />
                          Locked
                        </span>
                      )}
                      <Badge 
                        variant="outline" 
                        className={`${sdlcBadgeColors[phase.sdlcType as keyof typeof sdlcBadgeColors]} text-xs font-medium`}
                      >
                        {phase.sdlcType}
                      </Badge>
                    </div>
                  </div>

                  <div className={`text-xs font-medium mb-3 ${statusTextColor}`}>
                    {statusLabel}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Progress</span>
                      <span className="font-semibold text-gray-900">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${progressColor}`} 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {!locked && (
                    <ArrowRight className="absolute right-3 bottom-3 h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}