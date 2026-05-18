import { countOpenWipTasksInStage, type WipCountableTask } from '@/lib/kanban/wip-count'
import { wipAppliesToStage } from '@/lib/kanban/wip-policy'

export const AGING_WARN_DAYS = 7
export const AGING_CRITICAL_DAYS = 14
const LEAD_TIME_WINDOW_DAYS = 30

export type FlowAnalyticsTask = WipCountableTask & {
  title: string
  created_at: string
  current_stage_entered_at?: string | null
  updated_at?: string | null
}

export type FlowAnalyticsStage = {
  id: string
  name: string
  is_done: boolean
  is_backlog: boolean
  stage_order: number
  wip_limit?: number | null
}

export type WipColumnStatus = {
  stageId: string
  stageName: string
  wipLimit: number | null
  openCount: number
  wipCount: number
  overLimit: boolean
  wipApplies: boolean
}

export type AgingTaskRow = {
  id: string
  title: string
  stageName: string
  daysInStage: number
  daysInStageLabel: string
  daysTotal: number
  blocked: boolean
  severity: 'normal' | 'warn' | 'critical'
}

export type LeadTimeBucket = {
  label: string
  count: number
  minDays: number
  maxDays: number
}

export type KanbanFlowAnalytics = {
  wipExcludeBlocked: boolean
  wipByColumn: WipColumnStatus[]
  agingTasks: AgingTaskRow[]
  leadTimeHistogram: LeadTimeBucket[]
  leadTimeSampleCount: number
  medianLeadTimeDays: number | null
}

const LEAD_BUCKETS: { label: string; minDays: number; maxDays: number }[] = [
  { label: '0–1d', minDays: 0, maxDays: 1 },
  { label: '2–3d', minDays: 2, maxDays: 3 },
  { label: '4–7d', minDays: 4, maxDays: 7 },
  { label: '8–14d', minDays: 8, maxDays: 14 },
  { label: '15–30d', minDays: 15, maxDays: 30 },
  { label: '31d+', minDays: 31, maxDays: Infinity },
]

function daysBetween(startIso: string, endMs: number = Date.now()) {
  const start = new Date(startIso).getTime()
  if (!Number.isFinite(start)) return 0
  return Math.max(0, (endMs - start) / 86400000)
}

function formatAgeLabel(days: number): string {
  if (days < 1 / 24) return '<1h'
  if (days < 1) return `${Math.max(1, Math.round(days * 24))}h`
  if (days < 14) return `${Math.round(days)}d`
  return `${Math.round(days)}d`
}

function stageEnteredAt(task: FlowAnalyticsTask): string {
  return task.current_stage_entered_at ?? task.updated_at ?? task.created_at
}

export function computeKanbanFlowAnalytics(
  tasks: FlowAnalyticsTask[],
  stages: FlowAnalyticsStage[],
  wipExcludeBlocked: boolean
): KanbanFlowAnalytics {
  const stageById = Object.fromEntries(stages.map((s) => [s.id, s]))
  const wipTasks = tasks.map((t) => ({
    id: t.id,
    workflow_stage_id: t.workflow_stage_id,
    completed_at: t.completed_at,
    blocked: t.blocked,
  }))

  const wipByColumn = [...stages]
    .sort((a, b) => a.stage_order - b.stage_order)
    .map((stage) => {
      const applies = wipAppliesToStage(stage)
      const openCount = tasks.filter(
        (t) => t.workflow_stage_id === stage.id && t.completed_at == null
      ).length
      const wipCount = applies
        ? countOpenWipTasksInStage(wipTasks, stage.id, { excludeBlockedFromWip: wipExcludeBlocked })
        : openCount
      const limit = stage.wip_limit ?? null
      const overLimit = applies && limit != null && wipCount > limit
      return {
        stageId: stage.id,
        stageName: stage.name,
        wipLimit: limit,
        openCount,
        wipCount,
        overLimit,
        wipApplies: applies,
      }
    })
    .filter((row) => row.wipApplies || row.openCount > 0)

  const now = Date.now()
  const agingTasks: AgingTaskRow[] = tasks
    .filter((t) => {
      if (t.completed_at) return false
      const stage = stageById[t.workflow_stage_id]
      if (!stage || stage.is_done || stage.is_backlog) return false
      return true
    })
    .map((t) => {
      const stage = stageById[t.workflow_stage_id]!
      const daysInStage = daysBetween(stageEnteredAt(t), now)
      const daysTotal = daysBetween(t.created_at, now)
      let severity: AgingTaskRow['severity'] = 'normal'
      if (daysInStage >= AGING_CRITICAL_DAYS) severity = 'critical'
      else if (daysInStage >= AGING_WARN_DAYS) severity = 'warn'
      return {
        id: t.id,
        title: t.title?.trim() || 'Untitled',
        stageName: stage.name,
        daysInStage,
        daysInStageLabel: formatAgeLabel(daysInStage),
        daysTotal: Math.round(daysTotal * 10) / 10,
        blocked: Boolean(t.blocked),
        severity,
      }
    })
    .sort((a, b) => b.daysInStage - a.daysInStage)

  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - LEAD_TIME_WINDOW_DAYS)
  const windowMs = windowStart.getTime()

  const leadSamples = tasks
    .filter((t) => {
      if (!t.completed_at) return false
      return new Date(t.completed_at).getTime() >= windowMs
    })
    .map((t) => daysBetween(t.created_at, new Date(t.completed_at!).getTime()))

  const leadTimeHistogram = LEAD_BUCKETS.map((b) => ({
    ...b,
    count: leadSamples.filter((d) => d >= b.minDays && d <= b.maxDays).length,
  }))

  const sorted = [...leadSamples].sort((a, b) => a - b)
  const medianLeadTimeDays =
    sorted.length === 0
      ? null
      : sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2

  return {
    wipExcludeBlocked,
    wipByColumn,
    agingTasks,
    leadTimeHistogram,
    leadTimeSampleCount: leadSamples.length,
    medianLeadTimeDays: medianLeadTimeDays != null ? Math.round(medianLeadTimeDays * 10) / 10 : null,
  }
}
