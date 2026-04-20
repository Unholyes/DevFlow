"use client";

import Link from 'next/link';
import { notFound } from 'next/navigation';

import ScrumView from '@/components/project/ScrumView';
import KanbanView from '@/components/project/KanbanView';
import WaterfallView from '@/components/project/WaterfallView';
import DevOpsView from '@/components/project/DevOpsView';

// --- Temporary Mock Data (Same as your overview page) ---
const mockProjects = [
  {
    id: '1', 
    name: 'E-Commerce Platform Redesign',
    phases: [
      { id: 'p1', name: 'Requirements', sdlcType: 'Waterfall', status: 'Completed', progress: 100 },
      { id: 'p2', name: 'Design', sdlcType: 'Waterfall', status: 'Completed', progress: 100 },
      { id: 'p3', name: 'Development', sdlcType: 'Scrum', status: 'In Progress', progress: 65 },
      { id: 'p4', name: 'Testing', sdlcType: 'Kanban', status: 'In Progress', progress: 40 },
      { id: 'p5', name: 'Deployment', sdlcType: 'DevOps', status: 'Not Started', progress: 0 },
    ]
  }
];

export default function PhasePage({ params }: { params: { id: string, phaseId: string } }) {
  // 1. Find the project and the specific phase using the URL parameters
  const project = mockProjects.find(p => p.id === params.id);
  const phase = project?.phases.find(p => p.id === params.phaseId);

  if (!project || !phase) {
    notFound();
  }

  return (
    <div className="space-y-6">
      
      {/* Top Header Section with Back Button */}
      <div>
        <Link 
          href={`/dashboard/projects/${project.id}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Project Overview
        </Link>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-medium text-gray-900">{project.name}</h1>
            <span className="text-gray-400">→</span>
            <h2 className="text-xl font-bold text-blue-600">{phase.name} Phase</h2>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Team Avatars Placeholder */}
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">JS</div>
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">SJ</div>
              <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">MC</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic View Rendering based on Phase Type */}
      <div className="mt-4">
        {phase.sdlcType === 'Scrum' && <ScrumView tasks={[]} />}
        {phase.sdlcType === 'Kanban' && <KanbanView tasks={[]} />}
        {phase.sdlcType === 'Waterfall' && <WaterfallView tasks={[]} />}
        {phase.sdlcType === 'DevOps' && <DevOpsView tasks={[]} />}
      </div>

    </div>
  );
}