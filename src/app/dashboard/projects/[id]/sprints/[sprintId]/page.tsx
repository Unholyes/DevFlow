"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, CheckCircle2, Clock, MoreVertical, GripVertical, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  story_points: number;
  assignee_id: string | null;
  position: number;
  workflow_stage_id?: string;
  workflow_stage?: { name: string };
}

interface Sprint {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  story_points_total: number;
  goal?: string;
}

const COLUMNS = [
  { id: 'todo', name: 'To Do', color: 'bg-gray-100' },
  { id: 'in_progress', name: 'In Progress', color: 'bg-blue-100' },
  { id: 'in_review', name: 'In Review', color: 'bg-purple-100' },
  { id: 'done', name: 'Done', color: 'bg-green-100' },
];

const priorityColors = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low: 'bg-green-50 text-green-700 border-green-200',
};

function SortableTaskCard({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-move">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div {...attributes} {...listeners} className="cursor-grab">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
          <span className="text-xs font-mono text-gray-400">{task.id}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-500">{task.story_points} pts</span>
          <button className="text-gray-400 hover:text-gray-600">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>
      <h4 className="text-sm font-semibold text-gray-900 mb-2 leading-snug">{task.title}</h4>
      <div className="flex justify-between items-center">
        <Badge variant="outline" className={`${priorityColors[task.priority]} text-xs`}>{task.priority}</Badge>
      </div>
    </div>
  );
}

export default function SprintBoardPage({ params }: { params: { id: string; sprintId: string } }) {
  const router = useRouter();
  const [sprint, setSprint] = useState<Sprint>({
    id: 'sprint-1',
    name: 'Sprint 1: Core Features',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
    story_points_total: 24,
    goal: 'Complete authentication and dashboard features',
  });
  const [tasks, setTasks] = useState<Task[]>([
    { id: 'TASK-001', title: 'User authentication system', description: 'Implement OAuth2 login with Google and GitHub providers', priority: 'high', story_points: 8, assignee_id: null, position: 0, workflow_stage: { name: 'To Do' } },
    { id: 'TASK-002', title: 'Dashboard analytics', description: 'Create charts and graphs for project metrics', priority: 'medium', story_points: 5, assignee_id: null, position: 1, workflow_stage: { name: 'In Progress' } },
    { id: 'TASK-003', title: 'Email notifications', description: 'Send email alerts for task assignments and deadlines', priority: 'low', story_points: 3, assignee_id: null, position: 2, workflow_stage: { name: 'To Do' } },
    { id: 'TASK-004', title: 'File upload feature', description: 'Allow users to attach files to tasks and comments', priority: 'medium', story_points: 5, assignee_id: null, position: 3, workflow_stage: { name: 'In Review' } },
    { id: 'TASK-005', title: 'Mobile responsive design', description: 'Optimize UI for mobile devices', priority: 'high', story_points: 8, assignee_id: null, position: 4, workflow_stage: { name: 'Done' } },
  ]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const completedTasks = tasks.filter(t => t.workflow_stage?.name === 'Done').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const daysRemaining = Math.ceil((new Date(sprint.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      console.log(`Drag ${active.id} to ${over.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{sprint.name}</h1>
                <Badge className="bg-blue-100 text-blue-700">Active</Badge>
              </div>
              <p className="text-gray-600 mb-4">{sprint.goal || 'No goal set'}</p>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{daysRemaining} days remaining</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Total Points: {sprint.story_points_total}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push(`/dashboard/projects/${params.id}/sprints/${params.sprintId}/burndown`)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Burndown Chart
              </Button>
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Task to Sprint</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-gray-600">Task creation form will go here</p>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Sprint
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Sprint Progress</span>
            <span className="text-sm font-bold text-gray-900">{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{completedTasks} of {tasks.length} tasks completed</span>
            <span>{tasks.reduce((sum, t) => sum + t.story_points, 0)} of {sprint.story_points_total} story points</span>
          </div>
        </CardContent>
      </Card>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter(task => task.workflow_stage?.name === column.name).sort((a, b) => a.position - b.position);
            return (
              <div key={column.id} className="bg-gray-50 rounded-xl p-4 min-h-[600px]">
                <div className="flex justify-between items-center mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${column.color.replace('bg-', 'bg-').replace('100', '500')}`} />
                    <span className="font-semibold text-sm text-gray-800">{column.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{columnTasks.length}</Badge>
                </div>
                <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {columnTasks.map((task) => (
                      <SortableTaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </SortableContext>
                <button onClick={() => setIsCreateModalOpen(true)} className="w-full mt-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-sm font-medium hover:bg-gray-100 hover:border-gray-400 hover:text-gray-600 transition-all">
                  + Add Task
                </button>
              </div>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
