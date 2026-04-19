"use client";

import { useState } from 'react';
import CreateTaskModal from '@/components/project/CreateTaskModal';

// 1. Define the Task shape
interface Task {
  id: string; // E.g., TASK-1
  title: string;
  points: number; // E.g., 5 pts
  priority: 'High' | 'Medium' | 'Low';
  date: string; // E.g., Mar 22
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  assignee: {
    name: string;
    avatarBg: string; // Tailwind bg class for avatar
  };
}

// 2. Dummy Data (Replicating image_11.png)
const MOCK_TASKS_DATA: Task[] = [
  // To Do
  { id: 'TASK-1', title: 'Setup authentication flow', points: 5, priority: 'High', date: 'Mar 22', status: 'To Do', assignee: { name: 'JS', avatarBg: 'bg-blue-500' } },
  { id: 'TASK-2', title: 'Design login page UI', points: 3, priority: 'Medium', date: 'Mar 21', status: 'To Do', assignee: { name: 'SJ', avatarBg: 'bg-green-500' } },
  
  // In Progress
  { id: 'TASK-3', title: 'Implement JWT tokens', points: 8, priority: 'High', date: 'Mar 23', status: 'In Progress', assignee: { name: 'MC', avatarBg: 'bg-yellow-500' } },
  { id: 'TASK-4', title: 'Create user profile component', points: 5, priority: 'Medium', date: 'Mar 24', status: 'In Progress', assignee: { name: 'AB', avatarBg: 'bg-red-500' } },
  
  // In Review
  { id: 'TASK-5', title: 'Write unit tests for auth', points: 3, priority: 'High', date: 'Mar 20', status: 'In Review', assignee: { name: 'JS', avatarBg: 'bg-blue-500' } },
  
  // Done
  { id: 'TASK-6', title: 'Setup OAuth providers', points: 5, priority: 'Low', date: 'Mar 18', status: 'Done', assignee: { name: 'MC', avatarBg: 'bg-yellow-500' } },
];

const COLUMNS = ['To Do', 'In Progress', 'In Review', 'Done'];

export default function ScrumView() {
  const [boardTasks, setBoardTasks] = useState<Task[]>(MOCK_TASKS_DATA);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Status badge styling helper
  const getPriorityStyle = (priority: Task['priority']) => {
    switch (priority) {
      case 'High': return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'Medium': return 'bg-yellow-50 text-yellow-700 border border-yellow-100';
      case 'Low': return 'bg-green-50 text-green-700 border border-green-100';
      default: return 'bg-gray-50 text-gray-700 border border-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 3. Scrum Header Section (matches image) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-3">
             <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
             </div>
             <h2 className="text-xl font-bold text-gray-900">Active Sprint (Sprint 12: Core Features)</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                Create Task
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              Complete Sprint
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mt-1 max-w-4xl ml-16">
            Complete checkout flow and payment gateway integration. Target completion date: April 14, 2026.
        </p>
      </div>

      {/* 4. Sprint Sub-Header (Stats) */}
      <div className="flex items-center gap-6 px-1 text-sm text-gray-500">
          <div>Deadline: <span className="font-bold text-gray-900">4 days remaining</span></div>
          <div className="w-px h-4 bg-gray-200"></div>
          <div>Goal: <span className="font-medium text-gray-700">Payment integration</span></div>
          <div className="w-px h-4 bg-gray-200"></div>
          <div>Velocity: <span className="font-medium text-gray-700">42 pts</span></div>
          <div className="w-px h-4 bg-gray-200"></div>
          <div className="flex items-center gap-1.5">
            Progress
            <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">13/36 points completed</span>
          </div>
      </div>


      {/* 5. The 4-Column Board Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {COLUMNS.map((col) => (
          <div key={col} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 min-h-[600px] space-y-4">
            
            {/* Column Header */}
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{col}</span>
              <span className="text-[11px] font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                {boardTasks.filter(t => t.status === col).length}
              </span>
            </div>
            
            {/* Task List in the Column */}
            {boardTasks.filter(task => task.status === col).map(task => (
              <div key={task.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-medium text-gray-400 font-mono tracking-tight">{task.id}</span>
                  <div className="flex items-center gap-1">
                      <span className="text-[11px] font-medium text-gray-400">{task.points} pts</span>
                      <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                </div>

                <h4 className="text-[13px] font-semibold text-gray-900 leading-tight mb-4 group-hover:text-blue-600 transition-colors">
                  {task.title}
                </h4>

                <div className="flex justify-between items-end">
                  
                  <div className={`text-[11px] px-2 py-1 rounded-full font-bold capitalize ${getPriorityStyle(task.priority)}`}>
                    {task.priority}
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5">
                    <div className={`${task.assignee.avatarBg} w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-bold border-2 border-white shadow-inner`}>
                      {task.assignee.name}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        {task.date}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {isModalOpen && <CreateTaskModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}