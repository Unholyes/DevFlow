'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addMonths,
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
  Rocket,
  Timer,
  Loader2,
  Building2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type DeadlineType = 'task' | 'sprint' | 'project'

export type Deadline = {
  id: string
  date: Date
  title: string
  project: string
  type: DeadlineType
  href: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const typeIcons: Record<DeadlineType, typeof Timer> = {
  task: Timer,
  sprint: Rocket,
  project: Building2,
}

const typeLabel: Record<DeadlineType, string> = {
  task: 'Task due',
  sprint: 'Sprint',
  project: 'Project',
}

const typeStyles: Record<DeadlineType, string> = {
  task: 'bg-blue-50 text-blue-800 border-blue-200',
  sprint: 'bg-purple-50 text-purple-800 border-purple-200',
  project: 'bg-amber-50 text-amber-900 border-amber-200',
}

function deadlinesForDay(day: Date, all: Deadline[]) {
  return all.filter((d) => isSameDay(startOfDay(d.date), startOfDay(day)))
}

type ApiCalendarItem = {
  id: string
  kind: DeadlineType
  date: string
  title: string
  subtitle: string
  projectId: string
  href: string
}

function parseApiDate(ymd: string): Date {
  return new Date(`${ymd}T12:00:00`)
}

export function CalendarPageContent() {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadCalendar = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/me/calendar')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to load calendar')
      const raw = (json.items ?? []) as ApiCalendarItem[]
      setDeadlines(
        raw.map((row) => ({
          id: row.id,
          date: parseApiDate(row.date),
          title: row.title,
          project: row.subtitle,
          type: row.kind,
          href: row.href || '/dashboard/calendar',
        }))
      )
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load')
      setDeadlines([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCalendar()
  }, [loadCalendar])

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

  const sidebarDeadlines = useMemo(() => {
    if (selectedDay) {
      return deadlinesForDay(selectedDay, deadlines).sort((a, b) => compareAsc(a.date, b.date))
    }
    return upcomingDeadlines
  }, [selectedDay, deadlines, upcomingDeadlines])

  const monthLabel = format(visibleMonth, 'MMMM yyyy')

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Calendar</h1>
        <p className="mt-2 text-gray-600 max-w-2xl">
          Your task due dates, sprint start/end for projects you work on, and project target dates. Open an item from the
          list to jump to the task, sprint, or project.
        </p>
        {loading ? (
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading schedule…
          </p>
        ) : null}
        {loadError ? <p className="mt-2 text-sm text-red-600">{loadError}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_minmax(300px,380px)]">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--theme-primary)', opacity: 0.1 }}>
                <CalendarDays className="h-5 w-5" style={{ color: 'var(--theme-primary)' }} />
              </div>
              <div>
                <CardTitle className="text-lg text-gray-900">{monthLabel}</CardTitle>
                <CardDescription>Click a day to see its items in Upcoming</CardDescription>
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
                onClick={() => {
                  const t = startOfDay(new Date())
                  setVisibleMonth(startOfMonth(t))
                  setSelectedDay(t)
                }}
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
                const dayStart = startOfDay(day)
                const isSelected = selectedDay !== null && isSameDay(dayStart, selectedDay)
                return (
                  <button
                    key={format(day, 'yyyy-MM-dd')}
                    type="button"
                    onClick={() => {
                      setSelectedDay(dayStart)
                      if (!isSameMonth(day, visibleMonth)) {
                        setVisibleMonth(startOfMonth(day))
                      }
                    }}
                    aria-pressed={isSelected}
                    aria-label={`${format(day, 'EEEE, MMMM d, yyyy')}${hasDeadline ? `, ${dayDeadlines.length} item${dayDeadlines.length === 1 ? '' : 's'}` : ', no items'}`}
                    className={cn(
                      'min-h-[88px] bg-white p-1.5 text-left transition-colors hover:bg-gray-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-primary)]',
                      !inMonth && 'bg-gray-50/80 text-gray-400',
                      isToday(day) &&
                        inMonth &&
                        'ring-1 ring-inset bg-[color-mix(in_srgb,var(--theme-primary)_12%,white)]',
                      isSelected && 'ring-2 ring-inset ring-[var(--theme-primary)] z-[1]'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                        isToday(day) && inMonth ? 'text-white' : inMonth ? 'text-gray-900' : 'text-gray-400'
                      )}
                      style={
                        isToday(day) && inMonth ? { backgroundColor: 'var(--theme-primary)' } : undefined
                      }
                    >
                      {format(day, 'd')}
                    </span>
                    {hasDeadline && (
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {dayDeadlines.slice(0, 3).map((dl) => (
                          <span
                            key={dl.id}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor:
                                dl.type === 'task'
                                  ? 'var(--theme-primary)'
                                  : dl.type === 'sprint'
                                    ? '#a855f7'
                                    : '#d97706',
                            }}
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
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} /> Task due
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500" /> Sprint
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-600" /> Project
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm h-fit xl:sticky xl:top-24">
          <CardHeader className="px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-lg text-gray-900">
                  {selectedDay ? format(selectedDay, 'EEEE, MMM d') : 'Upcoming'}
                </CardTitle>
                <CardDescription>
                  {selectedDay
                    ? 'Items on this date'
                    : 'Nearest dates first (from today)'}
                </CardDescription>
              </div>
              {selectedDay ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-gray-200 text-gray-700"
                  onClick={() => setSelectedDay(null)}
                >
                  All upcoming
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[min(70vh,560px)] overflow-y-auto px-5 pb-5 pt-0 sm:px-6 sm:pb-6 scrollbar-gutter-stable">
            {!loading && sidebarDeadlines.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center leading-relaxed px-1">
                {selectedDay
                  ? 'Nothing scheduled on this date.'
                  : 'No upcoming dates. Add due dates on your tasks, set project targets, or plan sprints to see them here.'}
              </p>
            ) : (
              sidebarDeadlines.map((dl) => {
                const Icon = typeIcons[dl.type]
                return (
                  <Link
                    key={dl.id}
                    href={dl.href}
                    className="block rounded-lg border border-gray-100 bg-gray-50/80 p-4 transition-colors hover:bg-gray-50 hover:border-gray-200"
                  >
                    <div className="flex gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
                        <span className="text-[10px] font-semibold uppercase text-gray-500">
                          {format(dl.date, 'MMM')}
                        </span>
                        <span className="text-lg font-bold leading-tight text-gray-900">
                          {format(dl.date, 'd')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pr-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={cn('font-normal text-xs', typeStyles[dl.type])}>
                            <Icon className="mr-1 h-3 w-3" />
                            {typeLabel[dl.type]}
                          </Badge>
                        </div>
                        <p className="mt-1 font-medium text-gray-900 leading-snug">{dl.title}</p>
                        <p className="text-sm text-gray-500 truncate">{dl.project}</p>
                        <p className="text-xs text-gray-400 mt-1">{format(dl.date, 'EEEE, MMMM d, yyyy')}</p>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
