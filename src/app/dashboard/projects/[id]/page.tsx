"use client";

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { ProjectHeader } from '@/components/project/project-header';
import { ProjectStats } from '@/components/project/project-stats';

import ScrumView from '@/components/project/ScrumView';
import KanbanView from '@/components/project/KanbanView';
import WaterfallView from '@/components/project/WaterfallView';
import DevOpsView from '@/components/project/DevOpsView';

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

export default function ProjectPage({ params }: { params: { id: string } }) {
  const project = mockProjects.find(p => p.id === params.id);
  const tasks = mockTasksByProject[params.id as keyof typeof mockTasksByProject] || [];

  // Tracks which phase is clicked
  const [activePhaseId, setActivePhaseId] = useState('p3'); 

  if (!project) {
    notFound();
  }

  const activePhase = project.phases?.find(p => p.id === activePhaseId);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <ProjectHeader project={project} />
        <ProjectStats project={project} />

        {/* --- THIS IS THE HORIZONTAL TIMELINE EXACTLY FROM YOUR PICTURE --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Phases Timeline</h2>
          
          <div className="flex items-center overflow-x-auto pb-4">
            {project.phases?.map((phase, index) => {
              
              // Styling logic to match Figma perfectly
              const isCompleted = phase.status === 'Completed';
              const isInProgress = phase.status === 'In Progress';
              
              const cardBorder = isCompleted ? 'border-green-200 bg-green-50/20' : isInProgress ? 'border-blue-200 bg-blue-50/20' : 'border-gray-200 bg-gray-50';
              const statusColor = isCompleted ? 'text-green-600' : isInProgress ? 'text-blue-600' : 'text-gray-400';
              const barBg = isCompleted ? 'bg-green-500' : isInProgress ? 'bg-blue-600' : 'bg-gray-200';
              const icon = isCompleted ? '✓' : isInProgress ? '⏱' : '○';

              // Badge Colors
              const badgeColor = 
                phase.sdlcType === 'Waterfall' ? 'bg-blue-100 text-blue-700' :
                phase.sdlcType === 'Scrum' ? 'bg-purple-100 text-purple-700' :
                phase.sdlcType === 'Kanban' ? 'bg-orange-100 text-orange-700' :
                'bg-green-100 text-green-700';

              return (
                <div key={phase.id} className="flex items-center">
                  
                  {/* The Phase Card */}
                  <div 
                    onClick={() => setActivePhaseId(phase.id)}
                    className={`min-w-[260px] p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${cardBorder} ${activePhaseId === phase.id ? 'ring-2 ring-blue-500 shadow-md' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${statusColor}`}>{icon}</span>
                        <h3 className="font-semibold text-[15px] text-gray-900">{phase.name}</h3>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
                        {phase.sdlcType}
                      </span>
                    </div>
                    
                    <div className={`text-xs font-medium mb-3 ${statusColor}`}>
                      {phase.status}
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span className="font-medium text-gray-700">{phase.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${barBg}`} style={{ width: `${phase.progress}%` }}></div>
                    </div>
                  </div>

                  {/* The Arrow Separator (Hidden on the last item) */}
                  {index < project.phases!.length - 1 && (
                    <div className="mx-4 text-gray-300 font-bold">
                      {'>'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {/* --- END OF TIMELINE --- */}

        {/* The Dynamic Bottom View */}
        <div className="mt-8">
          {activePhase?.sdlcType === 'Scrum' && <ScrumView tasks={tasks} />}
          {activePhase?.sdlcType === 'Kanban' && <KanbanView tasks={tasks} />}
          {activePhase?.sdlcType === 'Waterfall' && <WaterfallView tasks={tasks} />}
          {activePhase?.sdlcType === 'DevOps' && <DevOpsView tasks={tasks} />}
        </div>
        
      </div>
    </DashboardLayout>
  );
}