"use client";

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import ScrumView from '@/components/project/ScrumView';

// --- Temporary Mock Data ---
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

export default function ScrumBoardPage({ params }: { params: { id: string, phaseId: string } }) {
  const project = mockProjects.find(p => p.id === params.id);
  const phase = project?.phases.find(p => p.id === params.phaseId);

  if (!project || !phase) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link 
        href={`/dashboard/projects/${params.id}/phases/${params.phaseId}`}
        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Phase Overview
      </Link>

      {/* Scrum Board */}
      <ScrumView />
    </div>
  );
}
