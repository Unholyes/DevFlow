// Authentication types
export interface User {
  id: string
  email: string
  role: UserRole
  tenantId?: string
}

export type UserRole = 'super_admin' | 'tenant_admin' | 'team_member'

// Profile types
export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  email?: string | null
  role: UserRole
  created_at: Date
  updated_at: Date
}

// Organization types
export interface Organization {
  id: string
  name: string
  owner_id: string
  created_at: Date
  updated_at: Date
}

// Organization member types
export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: 'admin' | 'member' | 'ai_assistant' | (string & { __customRoleBrand?: never })
  joined_at: Date
  profile?: Profile
}

// Tenant types
export interface Tenant {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

// Project types
export interface Project {
  id: string
  name: string
  description?: string
  tenantId: string
  sdlcMethodology: SDLCType
  status: ProjectStatus
  createdAt: Date
  updatedAt: Date
}

export type ProjectStatus = 'active' | 'archived' | 'completed'

// Task types
export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId?: string
  projectId: string
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

// SDLC types
export type SDLCType = 'scrum' | 'kanban' | 'waterfall' | 'devops'

// Scrum-specific types
export interface Sprint {
  id: string
  name: string
  projectId: string
  startDate: Date
  endDate: Date
  status: SprintStatus
}

// Matches DB enum: planned | active | closed
export type SprintStatus = 'planned' | 'active' | 'closed'

// Kanban-specific types
export interface KanbanColumn {
  id: string
  name: string
  projectId: string
  wipLimit?: number
  order: number
}

// Dashboard types
export interface DashboardStats {
  totalProjects: number
  totalTasks: number
  completedTasks: number
  activeSprints: number
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}