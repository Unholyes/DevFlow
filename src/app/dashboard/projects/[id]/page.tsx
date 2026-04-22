"use client";

import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { ProjectHeader } from '@/components/project/project-header';
import { ProjectStats } from '@/components/project/project-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Circle, ArrowRight, List, Plus } from 'lucide-react';

// The Data with the Phases included
const mockProjects = [
  {
    id: '1', 
    name: 'E-Commerce Platform Redesign',
    description: 'Complete overhaul of the shopping cart and checkout experience',
    sdlcMethodology: 'scrum' as const, 
    status: 'active' as const,
    progress: 68,
    tasksCount: 131,
    completedTasks: 89,
    dueDate: new Date('2026-06-20'),
    teamMembers: 4,
    phases: [
      { id: 'p1', name: 'Requirements', sdlcType: 'Waterfall', status: 'Completed', progress: 100 },
      { id: 'p2', name: 'Design', sdlcType: 'Waterfall', status: 'Completed', progress: 100 },
      { id: 'p3', name: 'Development', sdlcType: 'Scrum', status: 'In Progress', progress: 65 },
      { id: 'p4', name: 'Testing', sdlcType: 'Kanban', status: 'In Progress', progress: 40 },
      { id: 'p5', name: 'Deployment', sdlcType: 'DevOps', status: 'Not Started', progress: 0 },
    ]
  }
];

const mockTasksByProject = { '1': [] };

const sdlcBadgeColors = {
  Waterfall: 'bg-purple-100 text-purple-700 border-purple-200',
  Scrum: 'bg-blue-100 text-blue-700 border-blue-200',
  Kanban: 'bg-orange-100 text-orange-700 border-orange-200',
  DevOps: 'bg-green-100 text-green-700 border-green-200',
};

export default function ProjectPage({ params }: { params: { id: string } }) {
  const project = mockProjects.find(p => p.id === params.id);
  const tasks = mockTasksByProject[params.id as keyof typeof mockTasksByProject] || [];
  const router = useRouter();

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ProjectHeader project={project} />
      <ProjectStats project={project} />

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button onClick={() => router.push(`/dashboard/projects/${params.id}/backlog`)} variant="outline">
          <List className="h-4 w-4 mr-2" />
          View Backlog
        </Button>
        <Button onClick={() => router.push(`/dashboard/projects/${params.id}/sprints/plan`)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Plan Sprint
        </Button>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">Project Phases Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {project.phases?.map((phase, index) => {
              const isCompleted = phase.status === 'Completed';
              const isInProgress = phase.status === 'In Progress';
              const isNotStarted = phase.status === 'Not Started';

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
                  onClick={() => router.push(`/dashboard/projects/${project.id}/phases/${phase.id}`)}
                  className={`group relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md hover:border-blue-300 ${statusBg}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <StatusIcon className={`h-5 w-5 flex-shrink-0 ${statusTextColor}`} />
                      <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">{phase.name}</h3>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${sdlcBadgeColors[phase.sdlcType as keyof typeof sdlcBadgeColors]} text-xs font-medium`}
                    >
                      {phase.sdlcType}
                    </Badge>
                  </div>

                  <div className={`text-xs font-medium mb-3 ${statusTextColor}`}>
                    {phase.status}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Progress</span>
                      <span className="font-semibold text-gray-900">{phase.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${progressColor}`} 
                        style={{ width: `${phase.progress}%` }}
                      />
                    </div>
                  </div>

                  <ArrowRight className="absolute right-3 bottom-3 h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}