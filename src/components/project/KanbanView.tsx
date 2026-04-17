"use client";

import { useState } from 'react';

// --- Types ---
interface Task {
  id: string;
  title: string;
  tags: string[];
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  status: string;
  assignee: { name: string; avatarBg: string };
  date: string;
  isBlocked?: boolean;
  comments?: number;
  attachments?: number;
}

// --- Dummy Data matching image_12.png ---
const MOCK_KANBAN_TASKS: Task[] = [
  { id: 'KAN-1', title: 'Design user onboarding flow', tags: ['Design', 'UX'], priority: 'High', status: 'To Do', assignee: { name: 'SJ', avatarBg: 'bg-green-500' }, date: 'Mar 22', comments: 3 },
  { id: 'KAN-2', title: 'Update API documentation', tags: ['Docs'], priority: 'Low', status: 'To Do', assignee: { name: 'MC', avatarBg: 'bg-yellow-500' }, date: 'Mar 25', attachments: 2 },
  { id: 'KAN-3', title: 'Implement payment gateway', tags: ['Backend', 'Critical'], priority: 'High', status: 'In Progress', assignee: { name: 'JS', avatarBg: 'bg-blue-500' }, date: 'Mar 21', isBlocked: true, comments: 8 },
  { id: 'KAN-4', title: 'Fix mobile responsive issues', tags: ['Frontend'], priority: 'Medium', status: 'In Progress', assignee: { name: 'AB', avatarBg: 'bg-red-500' }, date: 'Mar 23', comments: 2 },
  { id: 'KAN-5', title: 'Optimize image loading', tags: ['Performance'], priority: 'Medium', status: 'In Progress', assignee: { name: 'SJ', avatarBg: 'bg-green-500' }, date: 'Mar 24', attachments: 1 },
  { id: 'KAN-6', title: 'E2E tests for checkout', tags: ['Testing', 'QA'], priority: 'High', status: 'Testing', assignee: { name: 'MC', avatarBg: 'bg-yellow-500' }, date: 'Mar 20', comments: 5 },
  { id: 'KAN-7', title: 'Security audit review', tags: ['Security'], priority: 'High', status: 'Testing', assignee: { name: 'JS', avatarBg: 'bg-blue-500' }, date: 'Mar 22', isBlocked: true, comments: 12, attachments: 3 },
  { id: 'KAN-8', title: 'Setup monitoring dashboard', tags: ['DevOps'], priority: 'Medium', status: 'Done', assignee: { name: 'AB', avatarBg: 'bg-red-500' }, date: 'Mar 19', comments: 4 },
];

const COLUMNS = [
  { name: 'To Do', wip: '2/10' },
  { name: 'In Progress', wip: '3/5' },
  { name: 'Testing', wip: '2/3' },
  { name: 'Done', wip: '1/20' }
];

export default function KanbanView() {
  const [tasks] = useState(MOCK_KANBAN_TASKS);

  return (
    <div className="space-y-6">
      {/* 1. Header Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: '8', color: 'text-gray-900' },
          { label: 'In Progress', value: '3', color: 'text-blue-600' },
          { label: 'Blocked Tasks', value: '2', color: 'text-red-600' },
          { label: 'Completed Today', value: '3', color: 'text-green-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 2. Board Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 text-sm">
          <h3 className="font-bold text-gray-800">Testing Phase Board</h3>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>Active</span>
            <span>•</span>
            <span>Continuous Flow</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
            <span className="text-lg leading-none">+</span> Create Task
          </button>
          <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-gray-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            Board Settings
          </button>
          <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50">+ Add Column</button>
        </div>
      </div>

      {/* 3. The Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-6 h-[calc(100vh-350px)]">
        {COLUMNS.map((col) => (
          <div key={col.name} className="min-w-[320px] flex flex-col gap-4">
            {/* Column Header */}
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
              <div>
                <span className="font-bold text-gray-800 text-sm">{col.name}</span>
                <span className="ml-2 text-xs text-gray-400 font-medium">{tasks.filter(t => t.status === col.name).length} tasks</span>
              </div>
              <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded border border-green-100 uppercase">WIP: {col.wip}</span>
            </div>

            {/* Task List */}
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {tasks.filter(t => t.status === col.name).map((task) => (
                <div key={task.id} className={`bg-white p-4 rounded-xl border ${task.isBlocked ? 'border-red-200' : 'border-gray-100'} shadow-sm hover:shadow-md transition-all group cursor-pointer`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{task.id}</span>
                    <button className="text-gray-300 hover:text-gray-600">•••</button>
                  </div>
                  
                  <h4 className="text-sm font-bold text-gray-800 mb-3 group-hover:text-blue-600 leading-snug">{task.title}</h4>
                  
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {task.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">{tag}</span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'}`}>
                      {task.priority}
                    </span>
                    {task.isBlocked && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 flex items-center gap-1">
                        ⚠️ Blocked
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`${task.assignee.avatarBg} w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold border-2 border-white`}>
                        {task.assignee.name}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        {task.date}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      {task.comments && <span className="flex items-center gap-1">💬 {task.comments}</span>}
                      {task.attachments && <span className="flex items-center gap-1">📎 {task.attachments}</span>}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add Task Dotted Button */}
              <button className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-medium hover:bg-gray-50 hover:border-blue-300 hover:text-blue-500 transition-all">
                + Add Task
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}