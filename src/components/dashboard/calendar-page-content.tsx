'use client'

import { useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  startOfDay,
  compareAsc,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Flag,
  Rocket,
  Timer,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type DeadlineType = 'task' | 'sprint' | 'milestone'

export type Deadline = {
  id: string
  date: Date
  title: string
  project: string
  type: DeadlineType
}

function buildMockDeadlines(): Deadline[] {
  const base = startOfDay(new Date())
  return [
    {
      id: '1',
      date: addDays(base, 0),
      title: 'Sprint 12 review & retro',
      project: 'E-commerce Platform',
      type: 'sprint',
    },
    {
      id: '2',
      date: addDays(base, 1),
      title: 'Deploy payment API to staging',
      project: 'E-commerce Platform',
      type: 'task',
    },
    {
      id: '3',
      date: addDays(base, 3),
      title: 'Design sign-off — checkout flow',
      project: 'Mobile App Redesign',
      type: 'milestone',
    },
    {
      id: '4',
      date: addDays(base, 5),
      title: 'Sprint 5 ends',
      project: 'API Migration',
      type: 'sprint',
    },
    {
      id: '5',
      date: addDays(base, 5),
      title: 'Load testing deadline',
      project: 'API Migration',
      type: 'task',
    },
    {
      id: '6',
      date: addDays(base, 8),
      title: 'Q2 release milestone',
      project: 'Customer Portal',
      type: 'milestone',
    },
    {
      id: '7',
      date: addDays(base, 12),
      title: 'Security audit remediation',
      project: 'Legacy System Upgrade',
      type: 'task',
    },
    {
      id: '8',
      date: addWeeks(base, 2),
      title: 'Sprint planning — backlog groomed',
      project: 'Data Analytics Dashboard',
      type: 'sprint',
    },
    {
      id: '9',
      date: addWeeks(base, 3),
      title: 'Beta launch date',
      project: 'Mobile App Redesign',
      type: 'milestone',
    },
    {
      id: '10',
      date: addWeeks(base, 5),
      title: 'Documentation freeze',
      project: 'E-commerce Platform',
      type: 'task',
    },
  ]
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const typeIcons: Record<DeadlineType, typeof Flag> = {
  task: Timer,
  sprint: Rocket,
  milestone: Flag,
}

const typeLabel: Record<DeadlineType, string> = {
  task: 'Task due',
  sprint: 'Sprint',
  milestone: 'Milestone',
}

const typeStyles: Record<DeadlineType, string> = {
  task: 'bg-blue-50 text-blue-800 border-blue-200',
  sprint: 'bg-purple-50 text-purple-800 border-purple-200',
  milestone: 'bg-amber-50 text-amber-900 border-amber-200',
}

function deadlinesForDay(day: Date, all: Deadline[]) {
  return all.filter((d) => isSameDay(startOfDay(d.date), startOfDay(day)))
}

export function CalendarPageContent() {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))

  const deadlines = useMemo(() => buildMockDeadlines(), [])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth)
    const monthEnd = endOfMonth(visibleMonth)
    const rangeStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd })
  }, [visibleMonth])

  const upcomingDeadlines = useMemo(() => {
    const today = startOfDay(new Date())
    return [...deadlines]
      .filter((d) => !isBefore(startOfDay(d.date), today))
      .sort((a, b) => compareAsc(a.date, b.date))
  }, [deadlines])

  const monthLabel = format(visibleMonth, 'MMMM yyyy')

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Calendar</h1>
        <p className="mt-2 text-gray-600 max-w-2xl">
          Task due dates, sprint boundaries, and milestones across your workspace. Connect Supabase
          later to sync real schedules.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_minmax(280px,320px)]">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-50 p-2">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-gray-900">{monthLabel}</CardTitle>
                <CardDescription>Click arrows to change month</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-gray-200"
                onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-gray-200 text-gray-700"
                onClick={() => setVisibleMonth(startOfMonth(new Date()))}
              >
                Today
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-gray-200"
                onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-7 gap-px rounded-lg border border-gray-200 bg-gray-200 overflow-hidden">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="bg-gray-50 px-1 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {d}
                </div>
              ))}
              {calendarDays.map((day) => {
                const inMonth = isSameMonth(day, visibleMonth)
                const dayDeadlines = deadlinesForDay(day, deadlines)
                const hasDeadline = dayDeadlines.length > 0
                return (
                  <button
                    key={format(day, 'yyyy-MM-dd')}
                    type="button"
                    className={cn(
                      'min-h-[88px] bg-white p-1.5 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
                      !inMonth && 'bg-gray-50/80 text-gray-400',
                      isToday(day) && inMonth && 'ring-1 ring-inset ring-blue-500 bg-blue-50/50'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                        isToday(day) && inMonth
                          ? 'bg-blue-600 text-white'
                          : inMonth
                            ? 'text-gray-900'
                            : 'text-gray-400'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {hasDeadline && (
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {dayDeadlines.slice(0, 3).map((dl) => (
                          <span
                            key={dl.id}
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              dl.type === 'task' && 'bg-blue-500',
                              dl.type === 'sprint' && 'bg-purple-500',
                              dl.type === 'milestone' && 'bg-amber-500'
                            )}
                            title={dl.title}
                          />
                        ))}
                        {dayDeadlines.length > 3 && (
                          <span className="text-[10px] leading-none text-gray-500">
                            +{dayDeadlines.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Task due
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500" /> Sprint
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Milestone
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm h-fit xl:sticky xl:top-24">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Upcoming deadlines</CardTitle>
            <CardDescription>Nearest dates first, including today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[min(70vh,560px)] overflow-y-auto pr-1">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No upcoming deadlines.</p>
            ) : (
              upcomingDeadlines.map((dl) => {
                const Icon = typeIcons[dl.type]
                return (
                  <div
                    key={dl.id}
                    className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
                        <span className="text-[10px] font-semibold uppercase text-gray-500">
                          {format(dl.date, 'MMM')}
                        </span>
                        <span className="text-lg font-bold leading-tight text-gray-900">
                          {format(dl.date, 'd')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn('font-normal text-xs', typeStyles[dl.type])}
                          >
                            <Icon className="mr-1 h-3 w-3" />
                            {typeLabel[dl.type]}
                          </Badge>
                        </div>
                        <p className="mt-1 font-medium text-gray-900 leading-snug">{dl.title}</p>
                        <p className="text-sm text-gray-500 truncate">{dl.project}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(dl.date, 'EEEE, MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
