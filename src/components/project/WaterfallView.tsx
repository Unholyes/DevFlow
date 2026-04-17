"use client";

import { useState } from 'react';
import CreateTaskModal from '@/components/project/CreateTaskModal';

// --- Dummy Data ---
const MOCK_TASKS = [
  { id: 'REQ-1', title: 'Gather stakeholder requirements', assignee: 'SJ', priority: 'High', date: 'Mar 10, 2026', status: 'Completed', isDone: true },
  { id: 'REQ-2', title: 'Create functional specification document', assignee: 'JS', priority: 'High', date: 'Mar 15, 2026', status: 'Completed', isDone: true },
  { id: 'REQ-3', title: 'Define system architecture requirements', assignee: 'MC', priority: 'High', date: 'Mar 18, 2026', status: 'In Progress', isDone: false },
  { id: 'REQ-4', title: 'Document API specifications', assignee: 'AB', priority: 'Medium', date: 'Mar 19, 2026', status: 'In Progress', isDone: false },
  { id: 'REQ-5', title: 'Create user stories and use cases', assignee: 'SJ', priority: 'Medium', date: 'Mar 20, 2026', status: 'Not Started', isDone: false },
  { id: 'REQ-6', title: 'Review and approve requirements', assignee: 'JS', priority: 'High', date: 'Mar 20, 2026', status: 'Not Started', isDone: false },
];

const CHECKLIST = [
  { id: 1, text: 'All requirements documented', done: true },
  { id: 2, text: 'Stakeholder approval received', done: true },
  { id: 3, text: 'Design brief created', done: true },
  { id: 4, text: 'Budget approved', done: true },
  { id: 5, text: 'Timeline confirmed', done: false },
];

const PROGRESSION_STEPS = [
  { name: 'Requirements', status: 'active', progress: '60% complete', date: 'Mar 1, 2026 - Mar 20, 2026' },
  { name: 'Design', status: 'locked', date: 'Starts: Mar 21, 2026' },
  { name: 'Implementation', status: 'locked', date: 'Starts: Apr 11, 2026' },
  { name: 'Testing', status: 'locked', date: 'Starts: May 16, 2026' },
  { name: 'Deployment', status: 'locked', date: 'Starts: Jun 6, 2026' },
];

export default function WaterfallView({ tasks }: { tasks: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [localTasks, setLocalTasks] = useState(MOCK_TASKS);
  const [checklist, setChecklist] = useState(CHECKLIST);

  const completedTasksCount = localTasks.filter(task => task.status === 'Completed').length;
  const totalTasksCount = localTasks.length;

  const handleStatusChange = (taskId: string, newStatus: string) => {
    setLocalTasks(localTasks.map(task => {
      if (task.id === taskId) {
        return { 
          ...task, 
          status: newStatus,
          isDone: newStatus === 'Completed' 
        };
      }
      return task;
    }));
  };

  const toggleTask = (taskId: string) => {
    setLocalTasks(localTasks.map(task => {
      if (task.id === taskId) {
        const newIsDone = !task.isDone;
        return { 
          ...task, 
          isDone: newIsDone,
          status: newIsDone ? 'Completed' : 'Not Started'
        };
      }
      return task;
    }));
  };

  const toggleChecklist = (id: number) => {
    setChecklist(checklist.map(c => c.id === id ? { ...c, done: !c.done } : c));
  };

  return (
    <div className="space-y-6">
      
{/* 1. Sub-Header Section */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-gray-900">Requirements Phase</h2>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Active
            </span>
            <span>33% complete</span>
            <span>Deadline: Mar 20, 2026</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* CREATE TASK BUTTON */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Create Task
          </button>
          
          {/* PHASE SETTINGS BUTTON */}
          <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            Phase Settings
          </button>
        </div>
      </div>

      {/* 2. Phase Progression Stepper */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-8 uppercase tracking-wider">Phase Progression</h3>
        
        <div className="relative flex justify-between items-start">
          <div className="absolute top-6 left-0 w-full h-[2px] bg-gray-100 -z-10"></div>
          
          {PROGRESSION_STEPS.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center bg-white px-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 mb-3 transition-colors ${
                step.status === 'active' ? 'border-blue-500 text-blue-500 bg-blue-50' : 'border-gray-200 text-gray-400 bg-gray-50'
              }`}>
                {step.status === 'active' ? (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                ) : (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-800">{step.name}</span>
              {step.status === 'active' ? (
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1 font-bold uppercase tracking-tighter">In Progress</span>
              ) : (
                <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mt-1 font-bold uppercase tracking-tighter">Locked</span>
              )}
              {step.progress && <span className="text-[10px] text-gray-500 mt-1">{step.progress}</span>}
              <span className="text-[10px] text-gray-400 mt-1">{step.date}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Current Phase Tasks */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-sm font-semibold text-gray-800">Current Phase Tasks</h3>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
              {completedTasksCount} of {totalTasksCount} completed
            </span>
          </div>
          
          <div className="divide-y divide-gray-100">
            {localTasks.map((task) => (
              <div key={task.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={task.isDone}
                  onChange={() => toggleTask(task.id)}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                />
                
                <div className="flex-1 flex items-center gap-3 text-[13px]">
                  <span className="font-medium text-gray-500 w-12">{task.id}</span>
                  <span className={`${task.isDone ? 'text-gray-400 line-through' : 'text-gray-800 font-medium'}`}>
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                    {task.assignee}
                  </div>
                  
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold w-16 text-center ${
                    task.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {task.priority}
                  </span>
                  
                  <div className="flex items-center gap-1 text-[11px] text-gray-500 w-24">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    {task.date}
                  </div>
                  
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    className={`text-[11px] px-2 py-1 rounded border font-bold w-28 text-center cursor-pointer outline-none transition-colors ${
                      task.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-700' :
                      task.status === 'In Progress' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                      task.status === 'In Review' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                      'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">In Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phase Details & Checklist Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Phase Details</h3>
            <div className="mb-4">
              <span className="text-[11px] text-gray-400 font-bold uppercase block mb-1">Current Phase</span>
              <span className="text-sm font-bold text-gray-900">Requirements</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 text-[13px]">
              <div>
                <span className="text-[11px] text-gray-400 font-bold uppercase block mb-1">Start Date</span>
                <span className="font-semibold text-gray-800">Mar 1, 2026</span>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 font-bold uppercase block mb-1">End Date</span>
                <span className="font-semibold text-gray-800">Mar 20, 2026</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-gray-500 font-bold uppercase">Phase Progress</span>
                <span className="font-bold text-gray-800">33%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '33%' }}></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Phase Completion Checklist</h3>
            <div className="space-y-3 mb-6">
              {checklist.map((item) => (
                <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={item.done}
                    onChange={() => toggleChecklist(item.id)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className={`text-[13px] ${item.done ? 'text-gray-400 line-through' : 'text-gray-700 group-hover:text-gray-900 font-medium'}`}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-[11px] mb-1 font-bold uppercase">
                <span className="text-gray-500">Completion</span>
                <span className="text-gray-800">60%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
            
            <button className="w-full bg-gray-100 text-gray-400 py-2.5 rounded-lg text-sm font-bold cursor-not-allowed mb-3">
              Complete Phase (Locked)
            </button>
            
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 flex items-start gap-2">
              <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              <p className="text-[11px] text-yellow-800 font-medium leading-relaxed">Next phase unlocks when current phase is 100% complete</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}