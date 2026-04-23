"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Clock, Target, ArrowRight, ArrowLeft, Plus, Save, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BacklogTaskCard } from '@/components/project/backlog-task-card';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  story_points: number;
  assignee_id: string | null;
  position: number;
}

const historicalVelocity = 42;

export default function SprintPlanningPage({ params }: { params: { id: string, phaseId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sprintName, setSprintName] = useState('Sprint 1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([
    { id: 'TASK-001', title: 'User authentication system', description: 'Implement OAuth2 login with Google and GitHub providers', priority: 'high', story_points: 8, assignee_id: null, position: 0 },
    { id: 'TASK-002', title: 'Dashboard analytics', description: 'Create charts and graphs for project metrics', priority: 'medium', story_points: 5, assignee_id: null, position: 1 },
    { id: 'TASK-003', title: 'Email notifications', description: 'Send email alerts for task assignments and deadlines', priority: 'low', story_points: 3, assignee_id: null, position: 2 },
    { id: 'TASK-004', title: 'File upload feature', description: 'Allow users to attach files to tasks and comments', priority: 'medium', story_points: 5, assignee_id: null, position: 3 },
    { id: 'TASK-005', title: 'Mobile responsive design', description: 'Optimize UI for mobile devices', priority: 'high', story_points: 8, assignee_id: null, position: 4 },
  ]);
  const [sprintTasks, setSprintTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  // Pre-select tasks from URL params
  useEffect(() => {
    const tasksParam = searchParams.get('tasks');
    if (tasksParam) {
      setSelectedTasks(new Set(tasksParam.split(',')));
    }
  }, [searchParams]);

  const selectedTaskObjects = backlogTasks.filter(t => selectedTasks.has(t.id));
  const totalStoryPoints = selectedTaskObjects.reduce((sum, t) => sum + t.story_points, 0);
  const remainingBacklog = backlogTasks.filter(t => !selectedTasks.has(t.id));

  const capacityStatus = totalStoryPoints > historicalVelocity ? 'over' : totalStoryPoints < historicalVelocity * 0.8 ? 'under' : 'optimal';

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleAddToSprint = () => {
    const tasksToAdd = backlogTasks.filter(t => selectedTasks.has(t.id));
    setSprintTasks([...sprintTasks, ...tasksToAdd]);
    setBacklogTasks(remainingBacklog);
    setSelectedTasks(new Set());
  };

  const handleRemoveFromSprint = (taskId: string) => {
    const taskToRemove = sprintTasks.find(t => t.id === taskId);
    if (taskToRemove) {
      setBacklogTasks([...backlogTasks, taskToRemove]);
      setSprintTasks(sprintTasks.filter(t => t.id !== taskId));
    }
  };

  const handleStartSprint = () => {
    if (!sprintName || !startDate || !endDate) {
      alert('Please fill in all sprint details');
      return;
    }
    
    if (sprintTasks.length === 0) {
      alert('Please add at least one task to the sprint');
      return;
    }

    // Mock sprint creation - just navigate to a mock sprint ID
    const mockSprintId = 'sprint-1';
    router.push(`/dashboard/projects/${params.id}/phases/${params.phaseId}/sprints/${mockSprintId}`);
  };

  const handleSaveDraft = () => {
    console.log('Saving sprint draft');
  };

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>;
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Sprint Planning</h1>
          <p className="text-gray-600 mt-1">Select tasks from backlog and plan your sprint</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            className="bg-green-600 hover:bg-green-700"
            onClick={handleStartSprint}
            disabled={!sprintName || !startDate || !endDate || sprintTasks.length === 0}
          >
            <Play className="h-4 w-4 mr-2" />
            Start Sprint
          </Button>
        </div>
      </div>

      {/* Sprint Details Form */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Sprint Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Name</label>
              <Input
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
                placeholder="Sprint 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capacity Indicator */}
      <Card className={`border-2 shadow-sm ${
        capacityStatus === 'over' ? 'border-red-200 bg-red-50/30' :
        capacityStatus === 'under' ? 'border-yellow-200 bg-yellow-50/30' :
        'border-green-200 bg-green-50/30'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${
                capacityStatus === 'over' ? 'bg-red-100' :
                capacityStatus === 'under' ? 'bg-yellow-100' :
                'bg-green-100'
              }`}>
                <Target className={`h-6 w-6 ${
                  capacityStatus === 'over' ? 'text-red-600' :
                  capacityStatus === 'under' ? 'text-yellow-600' :
                  'text-green-600'
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Sprint Capacity</h3>
                <p className="text-sm text-gray-600">
                  {totalStoryPoints} / {historicalVelocity} story points
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge className={
                capacityStatus === 'over' ? 'bg-red-100 text-red-700' :
                capacityStatus === 'under' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }>
                {capacityStatus === 'over' ? 'Over Capacity' :
                 capacityStatus === 'under' ? 'Under Capacity' :
                 'Optimal'}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">
                Based on historical velocity
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout: Backlog and Sprint */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backlog Column */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Product Backlog</CardTitle>
              <Badge variant="outline">{remainingBacklog.length} tasks</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {remainingBacklog.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>All tasks selected for sprint</p>
              </div>
            ) : (
              <div className="space-y-3">
                {remainingBacklog.map((task) => (
                  <BacklogTaskCard
                    key={task.id}
                    task={{
                      id: task.id,
                      title: task.title,
                      description: task.description,
                      priority: task.priority,
                      storyPoints: task.story_points,
                      assignee: null,
                      position: task.position,
                    }}
                    isSelected={selectedTasks.has(task.id)}
                    onSelect={() => toggleTaskSelection(task.id)}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                ))}
              </div>
            )}
            {selectedTasks.size > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleAddToSprint}
                  className="w-full"
                  disabled={selectedTasks.size === 0}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Add {selectedTasks.size} tasks to Sprint
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sprint Column */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Sprint Backlog</CardTitle>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {sprintTasks.length} tasks ({totalStoryPoints} pts)
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {sprintTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No tasks in sprint yet</p>
                <p className="text-sm mt-1">Select tasks from backlog to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sprintTasks.map((task) => (
                  <BacklogTaskCard
                    key={task.id}
                    task={{
                      id: task.id,
                      title: task.title,
                      description: task.description,
                      priority: task.priority,
                      storyPoints: task.story_points,
                      assignee: null,
                      position: task.position,
                    }}
                    isSelected={false}
                    onSelect={() => {}}
                    onEdit={() => {}}
                    onDelete={() => handleRemoveFromSprint(task.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sprint Summary */}
      {sprintTasks.length > 0 && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Sprint Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{sprintTasks.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Story Points</p>
                <p className="text-2xl font-bold text-gray-900">{totalStoryPoints}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Sprint Duration</p>
                <p className="text-2xl font-bold text-gray-900">
                  {startDate && endDate ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                  <span className="text-sm font-normal text-gray-600 ml-1">days</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Points/Day</p>
                <p className="text-2xl font-bold text-gray-900">
                  {startDate && endDate && totalStoryPoints > 0 
                    ? (totalStoryPoints / Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))).toFixed(1)
                    : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
