"use client";

import Link from 'next/link';
import { FolderKanban, Users, Calendar, TrendingUp } from 'lucide-react';

const mockProjects = [
  {
    id: '1',
    name: 'E-commerce Platform Redesign',
    description: 'Complete overhaul of the shopping cart and checkout experience',
    status: 'active' as const,
    progress: 68,
    tasksCount: 131,
    completedTasks: 89,
    dueDate: new Date('2026-06-20'),
    teamMembers: 4,
  },
  {
    id: '2',
    name: 'Mobile App Development',
    description: 'Native iOS and Android application for customer engagement',
    status: 'active' as const,
    progress: 42,
    tasksCount: 87,
    completedTasks: 37,
    dueDate: new Date('2026-08-15'),
    teamMembers: 6,
  },
  {
    id: '3',
    name: 'Data Analytics Dashboard',
    description: 'Business intelligence platform for executive reporting',
    status: 'planning' as const,
    progress: 15,
    tasksCount: 45,
    completedTasks: 7,
    dueDate: new Date('2026-09-30'),
    teamMembers: 3,
  },
];

export default function ProjectsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <p className="mt-2 text-gray-600">Manage and track all your projects</p>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProjects.map((project) => (
          <Link
            key={project.id}
            href={`/dashboard/projects/${project.id}`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FolderKanban className="h-6 w-6 text-purple-600" />
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                project.status === 'active' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {project.status}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium text-gray-900">{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span>{project.teamMembers} members</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{new Date(project.dueDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                <div className="flex items-center text-gray-600">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  <span>{project.completedTasks}/{project.tasksCount} tasks</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}