"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BacklogTaskCard } from '@/components/project/backlog-task-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  story_points: number;
  assignee_id: string | null;
  position: number;
}

export default function ProductBacklogPage({ params }: { params: { id: string, phaseId: string } }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([
    { id: 'TASK-001', title: 'User authentication system', description: 'Implement OAuth2 login with Google and GitHub providers', priority: 'high', story_points: 8, assignee_id: null, position: 0 },
    { id: 'TASK-002', title: 'Dashboard analytics', description: 'Create charts and graphs for project metrics', priority: 'medium', story_points: 5, assignee_id: null, position: 1 },
    { id: 'TASK-003', title: 'Email notifications', description: 'Send email alerts for task assignments and deadlines', priority: 'low', story_points: 3, assignee_id: null, position: 2 },
    { id: 'TASK-004', title: 'Payment gateway integration', description: 'Integrate payment processing with Stripe', priority: 'high', story_points: 13, assignee_id: null, position: 3 },
    { id: 'TASK-005', title: 'User profile management', description: 'Allow users to manage their profiles', priority: 'medium', story_points: 5, assignee_id: null, position: 4 },
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as 'high' | 'medium' | 'low', story_points: 0 });

  const filteredTasks = tasks.filter(task => {
    if (!task) return false;
    const matchesSearch = (task.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (task.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesFilter = filterPriority === 'all' || task.priority === filterPriority;
    return matchesSearch && matchesFilter;
  });

  const totalStoryPoints = filteredTasks.reduce((sum, task) => sum + (task.story_points || 0), 0);

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleAddToSprint = () => {
    if (selectedTasks.size === 0) return;
    router.push(`/dashboard/projects/${params.id}/phases/${params.phaseId}/sprints/plan?tasks=${Array.from(selectedTasks).join(',')}`);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  };

  const handleCreateTask = () => {
    const newTaskData: Task = {
      id: `TASK-${String(tasks.length + 1).padStart(3, '0')}`,
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      story_points: newTask.story_points,
      assignee_id: null,
      position: tasks.length,
    };
    setTasks([...tasks, newTaskData]);
    setNewTask({ title: '', description: '', priority: 'medium', story_points: 0 });
    setIsCreateModalOpen(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Product Backlog</h1>
          <p className="text-gray-600 mt-1">Manage and prioritize tasks for upcoming sprints</p>
        </div>
        <div className="flex gap-2">
          {selectedTasks.size > 0 && (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddToSprint}>
              <Plus className="h-4 w-4 mr-2" />
              Add {selectedTasks.size} tasks to Sprint
            </Button>
          )}
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{filteredTasks.length}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Story Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalStoryPoints}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{selectedTasks.size}</div>
          </CardContent>
        </Card>
      </div>

      {/* Create Task Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Input
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Enter task description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'high' | 'medium' | 'low' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Story Points</label>
              <Input
                type="number"
                min="0"
                max="21"
                value={newTask.story_points}
                onChange={(e) => setNewTask({ ...newTask, story_points: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreateTask} className="flex-1" disabled={!newTask.title}>
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters and Search */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterPriority === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterPriority('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterPriority === 'high' ? 'default' : 'outline'}
                onClick={() => setFilterPriority('high')}
                size="sm"
              >
                High
              </Button>
              <Button
                variant={filterPriority === 'medium' ? 'default' : 'outline'}
                onClick={() => setFilterPriority('medium')}
                size="sm"
              >
                Medium
              </Button>
              <Button
                variant={filterPriority === 'low' ? 'default' : 'outline'}
                onClick={() => setFilterPriority('low')}
                size="sm"
              >
                Low
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Backlog Items</CardTitle>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                Select All
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No tasks found in backlog</p>
              <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                Create your first task
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <BacklogTaskCard
                  key={task.id}
                  task={{
                    id: task.id || '',
                    title: task.title || 'Untitled',
                    description: task.description || '',
                    priority: task.priority || 'medium',
                    storyPoints: task.story_points || 0,
                    assignee: null,
                    position: task.position || 0,
                  }}
                  isSelected={selectedTasks.has(task.id)}
                  onSelect={() => toggleTaskSelection(task.id)}
                  onEdit={() => {}}
                  onDelete={() => handleDeleteTask(task.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
