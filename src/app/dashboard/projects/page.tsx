"use client"; // Required because we are adding click events (state)

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { ProjectHeader } from '@/components/project/project-header';
import { ProjectStats } from '@/components/project/project-stats';

import ScrumView from '@/components/project/ScrumView';
import KanbanView from '@/components/project/KanbanView';
import WaterfallView from '@/components/project/WaterfallView';
import DevOpsView from '@/components/project/DevOpsView';

// 1. Updated Mock Data to include nested phases
const mockProjects = [
  {
    id: '1', // E-commerce Platform
    name: 'E-commerce Platform Redesign',
    description: 'Complete overhaul of the shopping cart and checkout experience',
    status: 'active' as const,
    progress: 68,
    tasksCount: 131,
    completedTasks: 89,
    dueDate: new Date('2026-06-20'),
    teamMembers: 4,
    phases: [
      { id: 'p1', name: 'Requirements', sdlcType: 'waterfall', status: 'Completed', progress: 100 },
      { id: 'p2', name: 'Design', sdlcType: 'waterfall', status: 'Completed', progress: 100 },
      { id: 'p3', name: 'Development', sdlcType: 'scrum', status: 'In Progress', progress: 65 },
      { id: 'p4', name: 'Testing', sdlcType: 'kanban', status: 'In Progress', progress: 40 },
      { id: 'p5', name: 'Deployment', sdlcType: 'devops', status: 'Not Started', progress: 0 },
    ]
  }
];

// Mock tasks (you can keep your existing ones, just passing an empty array for now to prevent errors)
const mockTasksByProject = { '1': [] };

export default function ProjectPage({ params }: { params: { id: string } }) {
  const project = mockProjects.find(p => p.id === params.id);
  const tasks = mockTasksByProject[params.id as keyof typeof mockTasksByProject] || [];

  // 2. React State to track which phase is currently active/clicked
  // Defaulting to the 'Development' phase (p3)
  const [activePhaseId, setActivePhaseId] = useState('p3'); 

  if (!project) {
    notFound();
  }

  // Find the details of the currently selected phase
  const activePhase = project.phases?.find(p => p.id === activePhaseId);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <ProjectHeader project={project} />
        <ProjectStats project={project} />

        {/* 3. The Project Phases Timeline UI */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Project Phases Timeline</h3>
          
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {project.phases?.map((phase) => (
              <div 
                key={phase.id}
                onClick={() => setActivePhaseId(phase.id)}
                className={`min-w-[250px] cursor-pointer p-4 rounded-xl border-2 transition-all ${
                  activePhaseId === phase.id 
                    ? 'border-blue-500 bg-blue-50/30 shadow-md' // Active styling
                    : 'border-gray-200 hover:border-blue-300' // Inactive styling
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {/* Status Icon Placeholder */}
                    <span className={`w-4 h-4 rounded-full ${phase.status === 'Completed' ? 'bg-green-500' : phase.status === 'In Progress' ? 'bg-blue-500' : 'border-2 border-gray-300'}`}></span>
                    <h4 className="font-medium text-gray-900">{phase.name}</h4>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 font-medium capitalize`}>
                    {phase.sdlcType}
                  </span>
                </div>
                
                <div className="text-sm text-gray-500 mb-2">{phase.status}</div>
                
                <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{phase.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${phase.status === 'Completed' ? 'bg-green-500' : 'bg-blue-600'}`}
                    style={{ width: `${phase.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. DYNAMIC SDLC ROUTING - This changes when a card is clicked */}
        <div className="mt-8">
          {activePhase?.sdlcType === 'scrum' && <ScrumView tasks={tasks} />}
          {activePhase?.sdlcType === 'kanban' && <KanbanView tasks={tasks} />}
          {activePhase?.sdlcType === 'waterfall' && <WaterfallView tasks={tasks} />}
          {activePhase?.sdlcType === 'devops' && <DevOpsView tasks={tasks} />}
        </div>
        
      </div>
    </DashboardLayout>
  );
}