"use client";

import { useState } from 'react';

// --- Types ---
interface PipelineStep {
  name: string;
  icon: string;
  activeCount: number;
  successRate?: string;
  failedCount?: number;
  tasks: PipelineTask[];
}

interface PipelineTask {
  id: string;
  title: string;
  status: 'Success' | 'Running' | 'Pending' | 'Failed';
  assignee: string;
  version?: string;
  tag?: string;
  date?: string;
}

// --- Dummy Data ---
const PIPELINE_DATA: PipelineStep[] = [
  {
    name: 'Plan',
    icon: '📋',
    activeCount: 1,
    tasks: [
      { id: 'PLAN-1', title: 'Sprint planning for v2.4.0', status: 'Success', assignee: 'SJ', date: 'Mar 20' },
      { id: 'PLAN-2', title: 'Requirements review', status: 'Running', assignee: 'JS', date: 'Mar 21' },
    ]
  },
  {
    name: 'Build',
    icon: '🔨',
    activeCount: 1,
    successRate: '95%',
    tasks: [
      { id: 'BUILD-1', title: 'Compile application v2.4.0', status: 'Success', assignee: 'MC', version: 'v2.4.0' },
      { id: 'BUILD-2', title: 'Build Docker images', status: 'Running', assignee: 'AB', version: 'v2.4.0' },
      { id: 'BUILD-3', title: 'Generate artifacts', status: 'Pending', assignee: 'MC' },
    ]
  },
  {
    name: 'Test',
    icon: '🧪',
    activeCount: 1,
    failedCount: 1,
    successRate: '85%',
    tasks: [
      { id: 'TEST-1', title: 'Unit tests', status: 'Success', assignee: 'JS' },
      { id: 'TEST-2', title: 'Integration tests', status: 'Running', assignee: 'SJ' },
      { id: 'TEST-3', title: 'E2E test suite', status: 'Failed', assignee: 'AB' },
    ]
  },
  {
    name: 'Release',
    icon: '🏷️',
    activeCount: 0,
    tasks: [
      { id: 'REL-1', title: 'Create release v2.4.0', status: 'Success', assignee: 'MC', version: 'v2.4.0' },
      { id: 'REL-2', title: 'Tag repository', status: 'Success', assignee: 'JS', version: 'v2.4.0' },
    ]
  },
  {
    name: 'Deploy',
    icon: '🚀',
    activeCount: 0,
    tasks: [
      { id: 'DEP-1', title: 'Deploy to staging', status: 'Success', assignee: 'AB', version: 'v2.4.0', tag: 'Staging' },
      { id: 'DEP-2', title: 'Deploy to production', status: 'Pending', assignee: 'MC', version: 'v2.4.0', tag: 'Production' },
    ]
  },
  {
    name: 'Monitor',
    icon: '📈',
    activeCount: 1,
    tasks: [
      { id: 'MON-1', title: 'Health check monitoring', status: 'Running', assignee: 'SJ' },
      { id: 'MON-2', title: 'Performance metrics', status: 'Success', assignee: 'JS' },
    ]
  }
];

export default function DevOpsView() {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Success': return 'bg-green-50 text-green-600 border-green-100';
      case 'Running': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Pending': return 'bg-gray-50 text-gray-500 border-gray-100';
      case 'Failed': return 'bg-red-50 text-red-600 border-red-100';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 text-sm">
          <h3 className="font-bold text-gray-800">Deployment Pipeline</h3>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>2 active deployments</span>
            <span>|</span>
            <span>Last deployment: 2 hours ago</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Create Task</button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
            🚀 New Deployment
          </button>
          <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50">Pipeline Settings</button>
        </div>
      </div>

      {/* 2. Top Summary Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Items', val: '4', icon: '📈', color: 'text-blue-600' },
          { label: 'Failed Items', val: '1', icon: '❌', color: 'text-red-600' },
          { label: 'Completed Items', val: '7', icon: '✅', color: 'text-green-600' },
          { label: 'Success Rate', val: '50%', icon: '🚀', color: 'text-purple-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="bg-gray-50 p-3 rounded-lg text-xl">{s.icon}</div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. The Pipeline Flow */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_DATA.map((step, idx) => (
          <div key={step.name} className="flex items-center gap-4 min-w-[300px]">
            <div className="flex-1 space-y-4">
              {/* Step Header */}
              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white p-2 rounded-lg text-sm">{step.icon}</div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-800">{step.name}</h4>
                    <p className="text-[10px] text-gray-400">{step.tasks.length} items</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-3 text-[10px] font-bold">
                  <span className="text-blue-600">Active: {step.activeCount}</span>
                  {step.successRate && <span className="text-green-600">Success: {step.successRate}</span>}
                  {step.failedCount && <span className="text-red-600">Failed: {step.failedCount}</span>}
                </div>
              </div>

              {/* Step Tasks */}
              <div className="space-y-3">
                {step.tasks.map((task) => (
                  <div key={task.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-gray-400">{task.id}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${getStatusStyle(task.status)}`}>
                        {task.status === 'Running' && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse mr-1"></span>}
                        {task.status}
                      </span>
                    </div>
                    <h5 className="text-[11px] font-bold text-gray-800 leading-tight">{task.title}</h5>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-500 text-[8px] text-white flex items-center justify-center font-bold">{task.assignee}</div>
                        {task.version && <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1 rounded">{task.version}</span>}
                        {task.tag && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded">{task.tag}</span>}
                      </div>
                      {task.date && <span className="text-[9px] text-gray-400">{task.date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Arrow separator */}
            {idx < PIPELINE_DATA.length - 1 && <div className="text-blue-200 font-black text-xl">→</div>}
          </div>
        ))}
      </div>

      {/* 4. Footer Metrics */}
      <div className="grid grid-cols-3 gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-800 flex items-center gap-2">🏷️ Release Progress</h4>
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between"><span className="text-gray-400">Current Version</span><span className="font-bold">v2.4.0</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Next Release</span><span className="font-bold">Mar 25, 2026</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Features Included</span><span className="font-bold text-blue-600">12</span></div>
          </div>
        </div>
        <div className="space-y-4 border-x border-gray-50 px-6">
          <h4 className="text-xs font-bold text-gray-800 flex items-center gap-2">🧪 Testing Status</h4>
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between"><span className="text-gray-400">Unit Tests</span><span className="text-green-600 font-bold">324/324 passed</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Integration Tests</span><span className="text-green-600 font-bold">89/92 passed</span></div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-blue-500 h-full w-[87%]"></div>
            </div>
            <p className="text-right text-[9px] font-bold text-blue-600">87% Code Coverage</p>
          </div>
        </div>
        <div className="space-y-4 pl-6">
          <h4 className="text-xs font-bold text-gray-800 flex items-center gap-2">🚨 Monitoring Alerts</h4>
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between text-red-600"><span className="opacity-70">Critical</span><span className="font-black">0</span></div>
            <div className="flex justify-between text-yellow-600"><span className="opacity-70">Warning</span><span className="font-black">3</span></div>
            <div className="flex justify-between text-blue-600"><span className="opacity-70">Info</span><span className="font-black">8</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}