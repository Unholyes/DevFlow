'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
} from 'recharts'
import {
  Calendar,
  AlertTriangle,
  Check,
  ArrowRight,
  Plus,
  MessageCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const completionData = [
  { date: 'Mar 10', completed: 8, remaining: 22 },
  { date: 'Mar 11', completed: 11, remaining: 20 },
  { date: 'Mar 12', completed: 14, remaining: 18 },
  { date: 'Mar 13', completed: 16, remaining: 16 },
  { date: 'Mar 14', completed: 19, remaining: 14 },
  { date: 'Mar 15', completed: 21, remaining: 12 },
  { date: 'Mar 16', completed: 24, remaining: 10 },
  { date: 'Mar 17', completed: 28, remaining: 8 },
]

const workload = [
  { name: 'John Smith', tasks: 12, max: 12 },
  { name: 'Sarah Jones', tasks: 9, max: 12 },
  { name: 'Mike Chen', tasks: 7, max: 12 },
  { name: 'Alex Brown', tasks: 5, max: 12 },
]

const burndownData = [
  { day: 'Day 1', ideal: 24, actual: 24 },
  { day: 'Day 2', ideal: 20, actual: 22 },
  { day: 'Day 3', ideal: 16, actual: 19 },
  { day: 'Day 4', ideal: 12, actual: 15 },
  { day: 'Day 5', ideal: 8, actual: 11 },
  { day: 'Day 6', ideal: 4, actual: 7 },
  { day: 'Day 7', ideal: 0, actual: 4 },
]

const statusBreakdown = [
  { name: 'To Do', value: 8, color: '#9ca3af' },
  { name: 'In Progress', value: 12, color: '#2563eb' },
  { name: 'In Review', value: 5, color: '#9333ea' },
  { name: 'Done', value: 15, color: '#22c55e' },
  { name: 'Blocked', value: 3, color: '#ef4444' },
]

const blockedTasks = [
  {
    title: 'Deploy to production environment',
    reason: 'Waiting for security audit approval',
    assignee: 'John Smith',
    initials: 'JS',
    blockedAgo: 'Blocked 2 days ago',
  },
  {
    title: 'Implement payment processing',
    reason: 'API credentials pending from client',
    assignee: 'Sarah Jones',
    initials: 'SJ',
    blockedAgo: 'Blocked 5 days ago',
  },
  {
    title: 'Update database schema',
    reason: 'Pending DBA review on migration script',
    assignee: 'Mike Chen',
    initials: 'MC',
    blockedAgo: 'Blocked 1 day ago',
  },
]

const recentActivity = [
  {
    tone: 'bg-emerald-50 border-emerald-100',
    icon: Check,
    iconClass: 'text-emerald-600',
    text: "Alex Brown marked 'Setup CI/CD pipeline' as Done",
    time: '2 minutes ago',
  },
  {
    tone: 'bg-purple-50 border-purple-100',
    icon: ArrowRight,
    iconClass: 'text-purple-600',
    text: "Mike Chen moved 'Add email verification' to In Review",
    time: '15 minutes ago',
  },
  {
    tone: 'bg-blue-50 border-blue-100',
    icon: Plus,
    iconClass: 'text-blue-600',
    text: "John Smith created new task 'Implement user authentication API'",
    time: '1 hour ago',
  },
  {
    tone: 'bg-gray-50 border-gray-200',
    icon: MessageCircle,
    iconClass: 'text-gray-600',
    text: "Sarah Johnson commented on 'Fix login page redirect issue'",
    time: '2 hours ago',
  },
]

const TOTAL_TASKS = statusBreakdown.reduce((s, x) => s + x.value, 0)

export function ReportsAnalyticsContent() {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports &amp; Analytics</h1>
        <p className="text-gray-600">Analyze team performance and project metrics</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Select defaultValue="all-projects">
          <SelectTrigger className="w-[180px] bg-white border-gray-200">
            <SelectValue placeholder="Select Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-projects">All Projects</SelectItem>
            <SelectItem value="p1">E-commerce Platform</SelectItem>
            <SelectItem value="p2">Mobile App Redesign</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all-phases">
          <SelectTrigger className="w-[180px] bg-white border-gray-200">
            <SelectValue placeholder="Select Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-phases">All Phases</SelectItem>
            <SelectItem value="discovery">Discovery</SelectItem>
            <SelectItem value="build">Build</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="7d">
          <SelectTrigger className="w-[200px] bg-white border-gray-200">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <SelectValue placeholder="Date range" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Task Completion Overview</CardTitle>
          <CardDescription>Completed vs remaining tasks over time</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {hasMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" domain={[0, 32]} />
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="remaining"
                  name="Remaining"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Team Workload Distribution</CardTitle>
            <CardDescription>Number of tasks assigned per team member</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {workload.map((row) => (
              <div key={row.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900">{row.name}</span>
                  <span className="text-gray-500">{row.tasks} Tasks</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${(row.tasks / row.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Sprint Burndown Chart</CardTitle>
            <CardDescription>Tasks remaining over sprint duration</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {hasMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={burndownData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" domain={[0, 28]} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                  <Line
                    type="monotone"
                    dataKey="ideal"
                    name="Ideal Burndown"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual Burndown"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#2563eb' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Task Status Breakdown</CardTitle>
            <CardDescription>Distribution of tasks by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="relative h-[220px] w-[220px] shrink-0">
                {hasMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {statusBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} stroke="white" strokeWidth={2} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : null}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</span>
                  <span className="text-3xl font-bold text-gray-900">{TOTAL_TASKS}</span>
                </div>
              </div>
              <ul className="flex-1 space-y-2.5 w-full">
                {statusBreakdown.map((s) => (
                  <li key={s.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-gray-700">{s.name}</span>
                    </span>
                    <span className="font-medium text-gray-900 tabular-nums">({s.value})</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Blocked Tasks</CardTitle>
              <CardDescription>Tasks currently waiting for resolution</CardDescription>
            </div>
            <Badge variant="destructive" className="font-normal">
              3 Blocked
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {blockedTasks.map((t) => (
              <div
                key={t.title}
                className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 space-y-2"
              >
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 leading-snug">{t.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{t.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-7">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px]">{t.initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-700">{t.assignee}</span>
                  <span className="text-sm text-red-600">• {t.blockedAgo}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Latest updates across all projects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentActivity.map((row, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-3 rounded-lg border p-4 items-start',
                row.tone
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 border border-black/5',
                  row.iconClass
                )}
              >
                <row.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 leading-snug">{row.text}</p>
                <p className="text-xs text-gray-500 mt-1">{row.time}</p>
              </div>
            </div>
          ))}
          <div className="pt-2 text-center">
            <button
              type="button"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              View all activity
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
