// Application constants
export const APP_NAME = 'DevFlow'
export const APP_VERSION = '0.1.0'

// User roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  TEAM_MEMBER: 'team_member',
} as const

// Task priorities
export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const

// Task statuses
export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
  BLOCKED: 'blocked',
} as const

// SDLC methodologies
export const SDLC_TYPES = {
  SCRUM: 'scrum',
  KANBAN: 'kanban',
  WATERFALL: 'waterfall',
  DEVOPS: 'devops',
} as const

// Project statuses
export const PROJECT_STATUSES = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  COMPLETED: 'completed',
} as const

// Sprint statuses
export const SPRINT_STATUSES = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  COMPLETED: 'completed',
} as const

// Default WIP limits for Kanban
export const DEFAULT_WIP_LIMITS = {
  TODO: 0, // No limit
  IN_PROGRESS: 3,
  IN_REVIEW: 2,
  DONE: 0, // No limit
}

// Pagination
export const ITEMS_PER_PAGE = 20

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  API: 'yyyy-MM-dd',
  FULL: 'MMM dd, yyyy HH:mm',
}

// API endpoints (relative to /api)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LOGOUT: '/auth/logout',
    CALLBACK: '/auth/callback',
  },
  TENANTS: {
    CREATE: '/tenants/create',
    LIST: '/tenants',
    UPDATE: '/tenants/[id]/update',
    DELETE: '/tenants/[id]/delete',
  },
  PROJECTS: {
    CREATE: '/projects/create',
    LIST: '/projects',
    UPDATE: '/projects/[id]/update',
    DELETE: '/projects/[id]/delete',
  },
  TASKS: {
    CREATE: '/tasks/create',
    LIST: '/tasks',
    UPDATE: '/tasks/[id]/update',
    DELETE: '/tasks/[id]/delete',
  },
} as const