"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Plus, Calendar, CheckCircle2, Clock, ArrowLeft, TrendingUp, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Mock sprints data
const mockSprints = [
  { id: 'sprint-1', name: 'Sprint 1', startDate: '2026-03-01', endDate: '2026-03-14', status: 'completed', tasksCompleted: 12, totalTasks: 15, storyPoints: 42 },
  { id: 'sprint-2', name: 'Sprint 2', startDate: '2026-03-15', endDate: '2026-03-28', status: 'completed', tasksCompleted: 18, totalTasks: 20, storyPoints: 45 },
  { id: 'sprint-3', name: 'Sprint 3', startDate: '2026-03-29', endDate: '2026-04-11', status: 'active', tasksCompleted: 8, totalTasks: 16, storyPoints: 38 },
];

export default function SprintsPage({ params }: { params: { id: string, phaseId: string } }) {
  const [sprints] = useState(mockSprints);

  const activeSprints = sprints.filter(s => s.status === 'active');
  const completedSprints = sprints.filter(s => s.status === 'completed');
  const totalStoryPoints = sprints.reduce((sum, s) => sum + s.storyPoints, 0);
  const averageVelocity = Math.round(totalStoryPoints / sprints.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link 
          href={`/dashboard/projects/${params.id}/phases/${params.phaseId}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Phase Overview
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sprints</h1>
          <p className="text-gray-600 mt-1">Manage and track sprints for this phase</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/projects/${params.id}/phases/${params.phaseId}/sprints/plan`}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Sprint
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sprints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{sprints.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeSprints.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedSprints.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{averageVelocity}</div>
            <div className="text-xs text-gray-500 mt-1">points/sprint</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sprints */}
      {activeSprints.length > 0 && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Active Sprints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeSprints.map((sprint) => (
                <div key={sprint.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <PlayCircle className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-blue-900">{sprint.name}</h3>
                        <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                          <span>{sprint.startDate} - {sprint.endDate}</span>
                          <span>•</span>
                          <span>{sprint.storyPoints} story points</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-100 text-blue-700">Active</Badge>
                      <Link
                        href={`/dashboard/projects/${params.id}/phases/${params.phaseId}/sprints/${sprint.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                    <span>{sprint.tasksCompleted}/{sprint.totalTasks} tasks completed</span>
                    <span>•</span>
                    <span>{Math.round((sprint.tasksCompleted / sprint.totalTasks) * 100)}% complete</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all" 
                      style={{ width: `${(sprint.tasksCompleted / sprint.totalTasks) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Sprints */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Completed Sprints</CardTitle>
        </CardHeader>
        <CardContent>
          {completedSprints.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No completed sprints yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedSprints.map((sprint) => (
                <div key={sprint.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">{sprint.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>{sprint.startDate} - {sprint.endDate}</span>
                        <span>•</span>
                        <span>{sprint.storyPoints} story points</span>
                        <span>•</span>
                        <span>{sprint.tasksCompleted}/{sprint.totalTasks} tasks</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/projects/${params.id}/phases/${params.phaseId}/sprints/${sprint.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
