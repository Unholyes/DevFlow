'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  processBacklogPath,
  processBoardPath,
  processSummaryPath,
  processSwitcherPath,
} from '@/lib/processes/process-workspace-routes'

export type KanbanProcessTab = 'summary' | 'board' | 'backlog'

export function KanbanProcessChrome(props: {
  projectId: string
  phaseId: string
  processId: string
  processName: string
  currentTab: KanbanProcessTab
  allProcesses?: { id: string; name: string; methodology: string }[]
  children: React.ReactNode
}) {
  const base = `/dashboard/projects/${props.projectId}/phases/${props.phaseId}`
  const tabs: { id: KanbanProcessTab; label: string; href: string }[] = [
    { id: 'summary', label: 'Summary', href: processSummaryPath(props.projectId, props.phaseId, props.processId) },
    { id: 'board', label: 'Board', href: processBoardPath(props.projectId, props.phaseId, props.processId) },
    { id: 'backlog', label: 'Backlog', href: processBacklogPath(props.projectId, props.phaseId, props.processId) },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={base}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Phase Overview
        </Link>
        <p className="text-xs text-gray-500">
          Process: <span className="font-semibold text-gray-900">{props.processName}</span>
        </p>
      </div>

      {(props.allProcesses ?? []).length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          {(props.allProcesses ?? []).map((p) => (
            <Link
              key={p.id}
              href={processSwitcherPath(props.projectId, props.phaseId, p)}
              className={cn(
                'inline-flex items-center rounded-md border px-2.5 py-1 text-xs transition-colors',
                p.id === props.processId
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-white'
              )}
            >
              {p.name} ({p.methodology})
            </Link>
          ))}
        </div>
      ) : null}

      <nav className="flex flex-wrap gap-1 border-b border-gray-200" aria-label="Kanban process">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              props.currentTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {props.children}
    </div>
  )
}
