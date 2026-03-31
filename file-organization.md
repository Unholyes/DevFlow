# Proposed File Organization for Multi-Tenant SaaS Project Manager

## Overview
This document outlines the recommended file and directory structure for the DevFlow project, a multi-tenant SaaS platform for software development project management. The structure is designed to support scalability, maintainability, and clear separation of concerns across different domains (authentication, tenant management, project/task workflows, SDLC methodologies, etc.).

## Key Principles
- **Feature-based organization**: Group related functionality together
- **Separation of concerns**: Clear boundaries between frontend, backend, and shared logic
- **Scalability**: Support for multi-tenant architecture with tenant-specific routing
- **Type safety**: Centralized type definitions
- **Reusable components**: Modular UI components

## Proposed Directory Structure

```
src/
├── app/                           # Next.js App Router pages and layouts
│   ├── (auth)/                    # Authentication routes (login, signup, forgot-password)
│   │   ├── layout.tsx
│   │   ├── login/
│   │   ├── signup/
│   │   └── forgot-password/
│   ├── (admin)/                   # Super Admin routes
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── tenants/
│   │   └── analytics/
│   ├── (tenant)/                  # Tenant-specific routes
│   │   ├── [tenantId]/
│   │   │   ├── layout.tsx         # Tenant layout with sidebar/nav
│   │   │   ├── dashboard/         # Tenant overview dashboard
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx       # Projects list
│   │   │   │   ├── [projectId]/
│   │   │   │   │   ├── page.tsx   # Project details
│   │   │   │   │   ├── board/     # Kanban/Scrum board view
│   │   │   │   │   ├── tasks/
│   │   │   │   │   ├── calendar/
│   │   │   │   │   ├── settings/
│   │   │   │   │   └── reports/
│   │   │   ├── members/           # Team member management
│   │   │   ├── settings/          # Tenant settings
│   │   │   └── profile/           # User profile
│   ├── api/                       # API routes (backend logic)
│   │   ├── auth/                  # Authentication endpoints
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── callback/
│   │   ├── tenants/               # Tenant management
│   │   │   ├── create/
│   │   │   ├── [tenantId]/
│   │   │   │   ├── update/
│   │   │   │   ├── members/
│   │   │   │   └── delete/
│   │   ├── projects/              # Project CRUD
│   │   │   ├── create/
│   │   │   ├── [projectId]/
│   │   │   │   ├── update/
│   │   │   │   ├── tasks/
│   │   │   │   ├── workflow/
│   │   │   │   └── archive/
│   │   ├── tasks/                 # Task management
│   │   │   ├── create/
│   │   │   ├── [taskId]/
│   │   │   │   ├── update/
│   │   │   │   ├── assign/
│   │   │   │   └── comments/
│   │   ├── sdlc/                  # SDLC-specific logic
│   │   │   ├── scrum/
│   │   │   │   ├── sprints/
│   │   │   │   └── backlog/
│   │   │   ├── kanban/
│   │   │   ├── waterfall/
│   │   │   └── devops/
│   │   └── admin/                 # Super admin endpoints
│   │       ├── tenants/
│   │       ├── users/
│   │       └── stats/
│   ├── globals.css
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Landing page
├── components/                    # Reusable UI components
│   ├── ui/                        # Basic UI primitives (Button, Input, etc.)
│   ├── forms/                     # Form components (LoginForm, TaskForm, etc.)
│   ├── boards/                    # Board-related components
│   │   ├── KanbanBoard.tsx
│   │   ├── ScrumBoard.tsx
│   │   ├── WaterfallView.tsx
│   │   └── DevOpsPipeline.tsx
│   ├── charts/                    # Data visualization components
│   │   ├── BurndownChart.tsx
│   │   ├── ProgressChart.tsx
│   │   └── WorkloadChart.tsx
│   ├── dashboard/                 # Dashboard widgets
│   ├── calendar/                  # Calendar components
│   ├── layout/                    # Layout components (Sidebar, Header, etc.)
│   └── modals/                    # Modal dialogs
├── lib/                          # Utility libraries and configurations
│   ├── supabase/                 # Supabase client and utilities
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   └── middleware.ts
│   ├── database/                 # Database schemas and types
│   │   ├── types.ts              # Generated Supabase types
│   │   ├── schemas.ts            # Database schemas
│   │   └── queries.ts            # Common database queries
│   ├── auth/                     # Authentication utilities
│   │   ├── guards.ts             # Route guards
│   │   ├── permissions.ts        # Permission checking
│   │   └── roles.ts              # Role definitions
│   ├── sdlc/                     # SDLC logic and utilities
│   │   ├── scrum.ts
│   │   ├── kanban.ts
│   │   ├── waterfall.ts
│   │   └── devops.ts
│   └── utils/                    # General utilities
│       ├── date.ts
│       ├── validation.ts
│       └── formatting.ts
├── types/                        # TypeScript type definitions
│   ├── auth.ts
│   ├── tenant.ts
│   ├── project.ts
│   ├── task.ts
│   ├── sdlc.ts
│   └── index.ts                  # Re-exports all types
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts
│   ├── useTenant.ts
│   ├── useProject.ts
│   ├── useTasks.ts
│   ├── useSDLC.ts
│   └── useRealtime.ts            # Supabase realtime subscriptions
├── middleware.ts                 # Next.js middleware for auth/routing
├── constants.ts                  # Application constants
└── validations/                  # Validation schemas (Zod)
    ├── auth.ts
    ├── tenant.ts
    ├── project.ts
    └── task.ts
```

## Routing Strategy
- **Public routes**: Landing page, authentication pages
- **Protected routes**: All tenant-specific and admin routes require authentication
- **Multi-tenant routing**: Use dynamic routes `[tenantId]` for tenant isolation
- **Role-based access**: Middleware checks user roles for route access

## Database Organization
- Use Supabase with Row-Level Security (RLS) for tenant data isolation
- Tables grouped by domain (auth, tenants, projects, tasks, etc.)
- Separate schemas for different SDLC configurations

## Component Architecture
- **Atomic design**: UI components → Molecules → Organisms → Pages
- **Feature components**: Board views, forms, dashboards organized by feature
- **Shared components**: Reusable across features

## Key Considerations
1. **Tenant Isolation**: All tenant-specific data accessed through tenant context
2. **SDLC Flexibility**: Modular SDLC implementations that can be mixed per project phase
3. **Real-time Updates**: Supabase realtime for live collaboration
4. **Performance**: Lazy loading of components, optimized queries
5. **Security**: Proper authentication guards and permission checks

## Migration from Current Structure
The current basic Next.js structure can be gradually migrated to this organization by:
1. Creating the new directories
2. Moving existing files (globals.css, layout.tsx, page.tsx) to appropriate locations
3. Implementing authentication and tenant routing
4. Building out components and API routes incrementally

This structure provides a solid foundation for scaling the application while maintaining code organization and developer productivity.