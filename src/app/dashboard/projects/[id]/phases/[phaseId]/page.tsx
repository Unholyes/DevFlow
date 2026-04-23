"use client";

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useState } from 'react';
import { Plus, Layers, Calendar, CheckCircle2, Clock, ArrowRight, TrendingUp } from 'lucide-react';

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

// Mock backlog items
const mockBacklogItems = [
  { id: 'TASK-001', title: 'User authentication system', priority: 'high', storyPoints: 8 },
  { id: 'TASK-002', title: 'Dashboard analytics', priority: 'medium', storyPoints: 5 },
  { id: 'TASK-003', title: 'Email notifications', priority: 'low', storyPoints: 3 },
  { id: 'TASK-004', title: 'Payment gateway integration', priority: 'high', storyPoints: 13 },
  { id: 'TASK-005', title: 'User profile management', priority: 'medium', storyPoints: 5 },
];

// Mock sprints
const mockSprints = [
  { id: 'sprint-1', name: 'Sprint 1', startDate: '2026-03-01', endDate: '2026-03-14', status: 'completed', tasksCompleted: 12, totalTasks: 15 },
  { id: 'sprint-2', name: 'Sprint 2', startDate: '2026-03-15', endDate: '2026-03-28', status: 'completed', tasksCompleted: 18, totalTasks: 20 },
  { id: 'sprint-3', name: 'Sprint 3', startDate: '2026-03-29', endDate: '2026-04-11', status: 'active', tasksCompleted: 8, totalTasks: 16 },
];

export default function PhasePage({ params }: { params: { id: string, phaseId: string } }) {
  // 1. Find the project and the specific phase using the URL parameters
  const project = mockProjects.find(p => p.id === params.id);
  const phase = project?.phases.find(p => p.id === params.phaseId);

  const [showScrumView, setShowScrumView] = useState(false);

  if (!project || !phase) {
    notFound();
  }

  // For Scrum methodology, show overview first
  if (phase.sdlcType === 'Scrum' && !showScrumView) {
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
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Scrum</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">JS</div>
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">SJ</div>
                <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">MC</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrum Overview */}
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Layers className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Backlog</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{mockBacklogItems.length}</div>
              <div className="text-sm text-gray-500 mt-1">Items in backlog</div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Calendar className="h-5 w-5 text-green-600" />
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Active</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">1</div>
              <div className="text-sm text-gray-500 mt-1">Active sprint</div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Completed</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">2</div>
              <div className="text-sm text-gray-500 mt-1">Sprints completed</div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Velocity</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">30</div>
              <div className="text-sm text-gray-500 mt-1">Story points/sprint</div>
            </div>
          </div>

          {/* Backlog Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Product Backlog</h3>
                <p className="text-sm text-gray-500 mt-1">Manage and prioritize tasks for upcoming sprints</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/projects/${params.id}/phases/${params.phaseId}/backlog`}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Layers className="h-4 w-4" />
                  View All
                </Link>
                <Link
                  href={`/dashboard/projects/${params.id}/phases/${params.phaseId}/backlog`}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Link>
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {mockBacklogItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-gray-400">{item.id}</span>
                      <span className="text-sm font-medium text-gray-900">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        item.priority === 'high' ? 'bg-red-100 text-red-700' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {item.priority}
                      </span>
                      <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border">{item.storyPoints} pts</span>
                    </div>
                  </div>
                ))}
                {mockBacklogItems.length > 3 && (
                  <Link
                    href={`/dashboard/projects/${params.id}/phases/${params.phaseId}/backlog`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    View {mockBacklogItems.length - 3} more items
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Sprints Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Sprints</h3>
                <p className="text-sm text-gray-500 mt-1">Manage sprints and track progress</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/projects/${params.id}/phases/${params.phaseId}/sprints`}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  View All
                </Link>
                <Link
                  href={`/dashboard/projects/${params.id}/phases/${params.phaseId}/sprints/plan`}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Sprint
                </Link>
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {/* Active Sprint */}
                {mockSprints.filter(s => s.status === 'active').map((sprint) => (
                  <div key={sprint.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-900">{sprint.name}</span>
                        <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Active</span>
                      </div>
                      <Link
                        href={`/dashboard/projects/${params.id}/phases/${params.phaseId}/sprints/${sprint.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>{sprint.startDate} - {sprint.endDate}</span>
                      <span>•</span>
                      <span>{sprint.tasksCompleted}/{sprint.totalTasks} tasks completed</span>
                    </div>
                    <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(sprint.tasksCompleted / sprint.totalTasks) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                
                {/* Completed Sprints */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Completed Sprints</div>
                  {mockSprints.filter(s => s.status === 'completed').map((sprint) => (
                    <div key={sprint.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{sprint.name}</span>
                          <div className="text-xs text-gray-500">{sprint.startDate} - {sprint.endDate}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-500">{sprint.tasksCompleted}/{sprint.totalTasks} tasks</span>
                        <Link
                          href={`/dashboard/projects/${params.id}/phases/${params.phaseId}/sprints/${sprint.id}`}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* View Scrum Board Button */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Scrum Board</h3>
                <p className="text-sm text-gray-500 mt-1">View and manage tasks on the scrum board</p>
              </div>
              <button
                onClick={() => setShowScrumView(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Layers className="h-4 w-4" />
                Open Scrum Board
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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