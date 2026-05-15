import type { LucideIcon } from 'lucide-react'
import { Bug, CheckSquare, CornerDownRight, Layers, BookOpen } from 'lucide-react'

export const TASK_TYPES = ['task', 'bug', 'story', 'epic', 'subtask'] as const
export type TaskType = (typeof TASK_TYPES)[number]

export type TaskTypeMeta = {
  label: string
  shortLabel: string
  icon: LucideIcon
  iconClassName: string
  bgClassName: string
}

export const TASK_TYPE_META: Record<TaskType, TaskTypeMeta> = {
  task: {
    label: 'Task',
    shortLabel: 'Task',
    icon: CheckSquare,
    iconClassName: 'text-blue-600',
    bgClassName: 'bg-blue-50',
  },
  bug: {
    label: 'Bug',
    shortLabel: 'Bug',
    icon: Bug,
    iconClassName: 'text-red-600',
    bgClassName: 'bg-red-50',
  },
  story: {
    label: 'Story',
    shortLabel: 'Story',
    icon: BookOpen,
    iconClassName: 'text-emerald-600',
    bgClassName: 'bg-emerald-50',
  },
  epic: {
    label: 'Epic',
    shortLabel: 'Epic',
    icon: Layers,
    iconClassName: 'text-violet-600',
    bgClassName: 'bg-violet-50',
  },
  subtask: {
    label: 'Subtask',
    shortLabel: 'Sub',
    icon: CornerDownRight,
    iconClassName: 'text-sky-600',
    bgClassName: 'bg-sky-50',
  },
}

const TASK_TYPE_SET = new Set<string>(TASK_TYPES)

export function normalizeTaskType(raw: unknown): TaskType {
  if (typeof raw === 'string' && TASK_TYPE_SET.has(raw)) return raw as TaskType
  return 'task'
}

export function parseTaskTypeFromBody(raw: unknown): TaskType | null {
  if (raw == null || raw === '') return 'task'
  if (typeof raw === 'string' && TASK_TYPE_SET.has(raw)) return raw as TaskType
  return null
}
