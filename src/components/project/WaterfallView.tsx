"use client";

import { useState } from 'react';
import CreateTaskModal from '@/components/project/CreateTaskModal';
import { ChevronRight, Calendar, Users, MoreHorizontal, Plus, Settings, ZoomIn, ZoomOut, X, Clock, AlertCircle, LayoutGrid } from 'lucide-react';

// --- Types ---
type TimelineView = 'day' | 'week' | 'month';

interface GanttTask {
  id: string;
  title: string;
  assignee: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: 'Completed' | 'In Progress' | 'Not Started';
  priority: 'High' | 'Medium' | 'Low';
  color: string;
  description?: string;
  dependencies?: string[];
}

// --- Dummy Data ---
const GANTT_TASKS: GanttTask[] = [
  { 
    id: 'REQ-1', 
    title: 'Gather stakeholder requirements', 
    assignee: 'SJ', 
    startDate: new Date('2026-03-01'), 
    endDate: new Date('2026-03-05'),
    progress: 100,
    status: 'Completed',
    priority: 'High',
    color: '#10b981',
    description: 'Conduct interviews with key stakeholders to gather requirements for the new feature.',
    dependencies: []
  },
  { 
    id: 'REQ-2', 
    title: 'Create functional specification document', 
    assignee: 'JS', 
    startDate: new Date('2026-03-06'), 
    endDate: new Date('2026-03-10'),
    progress: 100,
    status: 'Completed',
    priority: 'High',
    color: '#10b981',
    description: 'Document all functional requirements in a comprehensive specification.',
    dependencies: ['REQ-1']
  },
  { 
    id: 'REQ-3', 
    title: 'Define system architecture requirements', 
    assignee: 'MC', 
    startDate: new Date('2026-03-08'), 
    endDate: new Date('2026-03-15'),
    progress: 75,
    status: 'In Progress',
    priority: 'High',
    color: '#3b82f6',
    description: 'Define the technical architecture and system requirements.',
    dependencies: ['REQ-2']
  },
  { 
    id: 'REQ-4', 
    title: 'Document API specifications', 
    assignee: 'AB', 
    startDate: new Date('2026-03-12'), 
    endDate: new Date('2026-03-18'),
    progress: 50,
    status: 'In Progress',
    priority: 'Medium',
    color: '#3b82f6',
    description: 'Create detailed API documentation for all endpoints.',
    dependencies: ['REQ-3']
  },
  { 
    id: 'REQ-5', 
    title: 'Create user stories and use cases', 
    assignee: 'SJ', 
    startDate: new Date('2026-03-16'), 
    endDate: new Date('2026-03-20'),
    progress: 0,
    status: 'Not Started',
    priority: 'Medium',
    color: '#6b7280',
    description: 'Write user stories and detailed use cases for the development team.',
    dependencies: ['REQ-2']
  },
  { 
    id: 'REQ-6', 
    title: 'Review and approve requirements', 
    assignee: 'JS', 
    startDate: new Date('2026-03-19'), 
    endDate: new Date('2026-03-20'),
    progress: 0,
    status: 'Not Started',
    priority: 'High',
    color: '#6b7280',
    description: 'Final review and approval of all requirements by stakeholders.',
    dependencies: ['REQ-3', 'REQ-4', 'REQ-5']
  },
];

// Generate timeline dates based on view mode
const generateTimelineDates = (tasks: GanttTask[], view: TimelineView) => {
  const allDates = tasks.flatMap(t => [t.startDate, t.endDate]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  
  // Add buffer based on view
  if (view === 'day') {
    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 2);
  } else if (view === 'week') {
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);
  } else if (view === 'month') {
    minDate.setMonth(minDate.getMonth() - 1);
    maxDate.setMonth(maxDate.getMonth() + 1);
  }
  
  const dates: Date[] = [];
  const currentDate = new Date(minDate);
  
  if (view === 'day') {
    while (currentDate <= maxDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else if (view === 'week') {
    // Start from the beginning of the week
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());
    while (currentDate <= maxDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7);
    }
  } else if (view === 'month') {
    // Start from the beginning of the month
    currentDate.setDate(1);
    while (currentDate <= maxDate) {
      dates.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }
  
  return dates;
};

export default function WaterfallView({ tasks }: { tasks: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);
  const [ganttTasks, setGanttTasks] = useState(GANTT_TASKS);
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [timelineView, setTimelineView] = useState<TimelineView>('day');
  
  const timelineDates = generateTimelineDates(ganttTasks, timelineView);
  const unitWidth = (timelineView === 'day' ? 50 : timelineView === 'week' ? 120 : 200) * zoomLevel;
  const totalWidth = timelineDates.length * unitWidth;

  const getTaskPosition = (task: GanttTask) => {
    const startIndex = timelineDates.findIndex(d => {
      if (timelineView === 'day') {
        return d.toDateString() === task.startDate.toDateString();
      } else if (timelineView === 'week') {
        const weekStart = new Date(d);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const taskWeekStart = new Date(task.startDate);
        taskWeekStart.setDate(taskWeekStart.getDate() - taskWeekStart.getDay());
        return weekStart.toDateString() === taskWeekStart.toDateString();
      } else {
        return d.getMonth() === task.startDate.getMonth() && d.getFullYear() === task.startDate.getFullYear();
      }
    });
    
    const endIndex = timelineDates.findIndex(d => {
      if (timelineView === 'day') {
        return d.toDateString() === task.endDate.toDateString();
      } else if (timelineView === 'week') {
        const weekStart = new Date(d);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const taskWeekEnd = new Date(task.endDate);
        taskWeekEnd.setDate(taskWeekEnd.getDate() - taskWeekEnd.getDay());
        return weekStart.toDateString() === taskWeekEnd.toDateString();
      } else {
        return d.getMonth() === task.endDate.getMonth() && d.getFullYear() === task.endDate.getFullYear();
      }
    });
    
    return {
      left: startIndex * unitWidth,
      width: (endIndex - startIndex + 1) * unitWidth
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Not Started': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return '';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-green-100 text-green-700';
      default: return '';
    }
  };

  const handleTaskClick = (task: GanttTask) => {
    setSelectedTask(task);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Requirements Phase Timeline</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>{ganttTasks.filter(t => t.status === 'In Progress').length} in progress</span>
            <span className="text-gray-300">|</span>
            <span>{ganttTasks.filter(t => t.status === 'Completed').length} completed</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Selector */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTimelineView('day')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                timelineView === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setTimelineView('week')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                timelineView === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimelineView('month')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                timelineView === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
          </div>
          
          <div className="h-6 w-px bg-gray-200 mx-2" />
          
          <button 
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4 text-gray-600" />
          </button>
          <button 
            onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4 text-gray-600" />
          </button>
          <div className="h-6 w-px bg-gray-200 mx-2" />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
          <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-280px)]">
        {/* Timeline Header - Fixed */}
        <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex">
            <div className="w-72 flex-shrink-0 p-3 border-r border-gray-200">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Task</div>
            </div>
            <div className="flex-1 overflow-x-auto">
              <div 
                className="flex"
                style={{ width: totalWidth }}
              >
                {timelineDates.map((date, idx) => (
                  <div 
                    key={idx}
                    className="flex-shrink-0 p-3 text-center border-r border-gray-100"
                    style={{ width: unitWidth }}
                  >
                    {timelineView === 'day' && (
                      <>
                        <div className="text-[10px] text-gray-400 uppercase">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="text-xs font-semibold text-gray-700">
                          {date.getDate()}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {date.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      </>
                    )}
                    {timelineView === 'week' && (
                      <>
                        <div className="text-[10px] text-gray-400 uppercase">
                          {date.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        <div className="text-xs font-semibold text-gray-700">
                          {date.getDate()}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Week {Math.ceil(date.getDate() / 7)}
                        </div>
                      </>
                    )}
                    {timelineView === 'month' && (
                      <>
                        <div className="text-[10px] text-gray-400 uppercase">
                          {date.toLocaleDateString('en-US', { year: 'numeric' })}
                        </div>
                        <div className="text-xs font-semibold text-gray-700">
                          {date.toLocaleDateString('en-US', { month: 'long' })}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {date.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gantt Body - Scrollable */}
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col">
            {ganttTasks.map((task, taskIdx) => {
              const position = getTaskPosition(task);
              
              return (
                <div 
                  key={task.id} 
                  className="flex border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => handleTaskClick(task)}
                >
                  {/* Task Info */}
                  <div className="w-72 flex-shrink-0 p-4 border-r border-gray-200 bg-white sticky left-0 z-10 group-hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: task.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-400">{task.id}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-gray-900 truncate">{task.title}</h4>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Users className="h-3 w-3" />
                            <span>{task.assignee}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>{task.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <ChevronRight className="h-3 w-3" />
                            <span>{task.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Bar */}
                  <div className="flex-1 relative min-h-[72px] overflow-x-auto">
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 h-8 rounded-lg shadow-sm hover:shadow-md transition-all group-hover:scale-105"
                      style={{ 
                        left: position.left, 
                        width: position.width,
                        backgroundColor: task.color + '20',
                        borderLeft: `4px solid ${task.color}`
                      }}
                    >
                      {/* Progress Bar */}
                      <div 
                        className="absolute top-0 left-0 h-full rounded-l-lg"
                        style={{ 
                          width: `${task.progress}%`,
                          backgroundColor: task.color,
                          opacity: 0.3
                        }}
                      />
                      
                      {/* Task Label */}
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-xs font-medium text-gray-700 truncate">
                          {task.progress}% complete
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-6">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-sm text-gray-600">Not Started</span>
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-mono text-gray-400">{selectedTask.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{selectedTask.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedTask(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Description */}
              {selectedTask.description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{selectedTask.description}</p>
                </div>
              )}
              
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assignee</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                      {selectedTask.assignee}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{selectedTask.assignee}</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Progress</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${selectedTask.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{selectedTask.progress}%</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Start Date</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {selectedTask.startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">End Date</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {selectedTask.endDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Dependencies */}
              {selectedTask.dependencies && selectedTask.dependencies.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Dependencies</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.dependencies.map((depId) => {
                      const depTask = ganttTasks.find(t => t.id === depId);
                      return depTask ? (
                        <div key={depId} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                          <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: depTask.color }} />
                          <span className="text-xs font-medium text-gray-700">{depTask.id}</span>
                          <span className="text-xs text-gray-500">- {depTask.title}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                Edit Task
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && <CreateTaskModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}