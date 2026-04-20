"use client";

import { useState } from 'react';
import { ChevronRight, CheckCircle2, Clock, XCircle, AlertTriangle, Activity, GitBranch, Rocket, Settings, Play, BarChart3, AlertCircle } from 'lucide-react';

// --- Types ---
interface PipelineStep {
  name: string;
  icon: React.ReactNode;
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
    icon: <GitBranch className="h-5 w-5" />,
    activeCount: 1,
    tasks: [
      { id: 'PLAN-1', title: 'Sprint planning for v2.4.0', status: 'Success', assignee: 'SJ', date: 'Mar 20' },
      { id: 'PLAN-2', title: 'Requirements review', status: 'Running', assignee: 'JS', date: 'Mar 21' },
    ]
  },
  {
    name: 'Build',
    icon: <Activity className="h-5 w-5" />,
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
    icon: <CheckCircle2 className="h-5 w-5" />,
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
    icon: <GitBranch className="h-5 w-5" />,
    activeCount: 0,
    tasks: [
      { id: 'REL-1', title: 'Create release v2.4.0', status: 'Success', assignee: 'MC', version: 'v2.4.0' },
      { id: 'REL-2', title: 'Tag repository', status: 'Success', assignee: 'JS', version: 'v2.4.0' },
    ]
  },
  {
    name: 'Deploy',
    icon: <Rocket className="h-5 w-5" />,
    activeCount: 0,
    tasks: [
      { id: 'DEP-1', title: 'Deploy to staging', status: 'Success', assignee: 'AB', version: 'v2.4.0', tag: 'Staging' },
      { id: 'DEP-2', title: 'Deploy to production', status: 'Pending', assignee: 'MC', version: 'v2.4.0', tag: 'Production' },
    ]
  },
  {
    name: 'Monitor',
    icon: <BarChart3 className="h-5 w-5" />,
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
      case 'Success': return 'bg-green-50 text-green-700 border-green-200';
      case 'Running': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending': return 'bg-gray-50 text-gray-600 border-gray-200';
      case 'Failed': return 'bg-red-50 text-red-700 border-red-200';
      default: return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Success': return <CheckCircle2 className="h-3 w-3" />;
      case 'Running': return <Clock className="h-3 w-3 animate-spin" />;
      case 'Pending': return <Clock className="h-3 w-3" />;
      case 'Failed': return <XCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-gray-900">Deployment Pipeline</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>2 active deployments</span>
            <span className="text-gray-300">|</span>
            <span>Last deployment: 2 hours ago</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + Create Task
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Rocket className="h-4 w-4" />
            New Deployment
          </button>
          <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Pipeline Settings
          </button>
        </div>
      </div>

      {/* Top Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Items', val: '4', icon: <Activity className="h-5 w-5" />, color: 'text-blue-600', bgColor: 'bg-blue-50' },
          { label: 'Failed Items', val: '1', icon: <XCircle className="h-5 w-5" />, color: 'text-red-600', bgColor: 'bg-red-50' },
          { label: 'Completed Items', val: '7', icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-green-600', bgColor: 'bg-green-50' },
          { label: 'Success Rate', val: '50%', icon: <BarChart3 className="h-5 w-5" />, color: 'text-purple-600', bgColor: 'bg-purple-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`${s.bgColor} p-2.5 rounded-lg ${s.color}`}>
                {s.icon}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {PIPELINE_DATA.map((step, idx) => (
          <div key={step.name} className="space-y-3">
            {/* Step Header */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-600 text-white p-2 rounded-lg flex-shrink-0">
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-gray-900 truncate">{step.name}</h4>
                  <p className="text-xs text-gray-500">{step.tasks.length} items</p>
                </div>
              </div>
              <div className="flex gap-4 text-xs font-medium">
                <span className="text-blue-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {step.activeCount} active
                </span>
                {step.successRate && <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {step.successRate}
                </span>}
                {step.failedCount && <span className="text-red-600 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {step.failedCount} failed
                </span>}
              </div>
            </div>

            {/* Step Tasks */}
            <div className="space-y-2">
              {step.tasks.map((task) => (
                <div key={task.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-gray-400">{task.id}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 flex-shrink-0 ${getStatusStyle(task.status)}`}>
                      {getStatusIcon(task.status)}
                      {task.status}
                    </span>
                  </div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{task.title}</h5>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-[10px] text-white flex items-center justify-center font-medium flex-shrink-0">
                        {task.assignee}
                      </div>
                      {task.version && <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{task.version}</span>}
                      {task.tag && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{task.tag}</span>}
                    </div>
                    {task.date && <span className="text-xs text-gray-400 flex-shrink-0">{task.date}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-purple-600" />
            Release Progress
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Current Version</span>
              <span className="font-medium text-gray-900">v2.4.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Next Release</span>
              <span className="font-medium text-gray-900">Mar 25, 2026</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Features Included</span>
              <span className="font-medium text-blue-600">12</span>
            </div>
          </div>
        </div>
        <div className="space-y-4 border-l border-gray-200 px-6">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Testing Status
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Unit Tests</span>
              <span className="font-medium text-green-600">324/324 passed</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Integration Tests</span>
              <span className="font-medium text-green-600">89/92 passed</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-2">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: '87%' }}></div>
            </div>
            <p className="text-right text-xs font-medium text-blue-600">87% Code Coverage</p>
          </div>
        </div>
        <div className="space-y-4 border-l border-gray-200 px-6">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            Monitoring Alerts
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-red-600">
              <span className="opacity-70">Critical</span>
              <span className="font-bold">0</span>
            </div>
            <div className="flex justify-between text-sm text-yellow-600">
              <span className="opacity-70">Warning</span>
              <span className="font-bold">3</span>
            </div>
            <div className="flex justify-between text-sm text-blue-600">
              <span className="opacity-70">Info</span>
              <span className="font-bold">8</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}