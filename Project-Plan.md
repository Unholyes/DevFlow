Brief Description of the Project
This project aims to develop a multi-tenant Software-as-a-Service (SaaS) project management system for software development organizations. Each organization has an isolated workspace where they can create projects, collaborate on tasks, and manage delivery using a configurable (hybrid) process.

The system focuses on a realistic understanding of “Hybrid SDLC”:
- Projects are broken into ordered project phases (e.g., Requirements → Design → Development → Testing → Release).
- The project may optionally enforce phase gates (Waterfall-style governance): a phase must be completed (and optionally approved) before the next phase can proceed.
- Inside each phase, the team selects a work management process (Scrum or Kanban) to execute the work.

Main goals of the system
- Provide organizations with isolated and secure workspaces (multi-tenant).
- Provide an onboarding-first experience: users configure the organization and project process before seeing the full dashboard.
- Support hybrid project management by combining phase gating (optional) with Scrum/Kanban execution per phase.
- Enable teams to collaborate, track, and complete work using role-based access control (RBAC).

Core User Flow (Corrected Architecture)
1) Sign Up / Sign In
2) Onboarding Wizard (before full dashboard)
   - Create organization workspace (name, basic info)
   - Create first project
   - Configure project phases (names, order)
   - Configure governance (phase gating on/off; optional “complete/approve” step)
   - For each phase choose process type (Scrum or Kanban) and initialize default columns/stages
   - Invite team members (optional)
3) Dashboard
   - Navigation and pages reflect the configured organization + project settings.

Roles and Responsibilities (RBAC)
The system uses a small, explainable role set.

1) Super Administrator (Platform Owner)
- Authentication: secure login for platform owners.
- Manage tenants (organizations/workspaces):
  - View all tenant organizations.
  - Approve/decline organization applications.
  - Suspend/activate/delete tenant accounts.
  - View platform-wide statistics (active tenants, total users, total projects).

2) Tenant Administrator (Organization Admin)
- Authentication: secure login for organization owners/admins.
- Manage organization workspace:
  - Update workspace settings (organization profile).
  - Invite/remove members.
  - Assign organization-level roles (Project Manager / Team Member).
- Manage projects (organization scope):
  - Create/archive/delete projects.
  - Assign members to projects.
  - Enable/disable project governance features (e.g., phase gating).

3) Project Manager (Project-level Admin)
- Scope: permissions apply only to projects they are assigned to.
- Manage project structure and process:
  - Configure project phases (order, titles) and apply governance rules.
  - For each phase, select the execution process (Scrum or Kanban).
  - Configure phase workflow stages/columns (and WIP limits for Kanban).
  - Manage Scrum artifacts for Scrum phases (backlog priority, sprint creation/planning, sprint close).
- Coordinate work:
  - Create/assign tasks, update priorities, monitor progress and team workload.

4) Team Member (Developer / General Member)
- Scope: permissions apply only to projects they are assigned to.
- Execute work:
  - Create and update tasks (or only update tasks assigned to them, depending on final policy).
  - Move tasks through workflow stages (columns).
  - Add comments, mark tasks as blocked and provide reasons.
  - View boards (Scrum/Kanban), calendars, and project analytics.
- Manage own profile:
  - Update own profile information.

Hybrid Process Model (How “Hybrid” Works)
Hybrid in this system means “configurable per phase,” not “one SDLC model equals one phase type.”

A) Project Phases (Milestones)
- A project contains ordered phases (e.g., Requirements, Design, Development, Testing, Release).
- Optional phase gating (Waterfall-style governance):
  - If enabled, Phase N+1 cannot be started until Phase N is marked complete (and optionally approved).
  - This provides a simple, explainable Waterfall-like control at the project level.

B) Execution inside a phase (Scrum or Kanban)
- Scrum phase features:
  - Product backlog (prioritize items, story points).
  - Sprint planning (move backlog items into a sprint, set sprint dates).
  - Scrum board (track sprint tasks).
  - Sprint close behavior (unfinished items return to backlog).
- Kanban phase features:
  - Continuous board with configurable columns.
  - Optional WIP limits per column.
  - Archive/completed workflow.

Key Pages / Modules (Conceptual)
- Onboarding wizard (org + first project + phase/process config)
- Organization dashboard (overview of projects, members, activity)
- Project dashboard (overview + phase timeline + progress)
- Phase workspace
  - If Scrum: Backlog / Sprint Planning / Sprint Board
  - If Kanban: Kanban Board
- Reports / Analytics (basic metrics such as tasks done, sprint burndown if Scrum)
- Calendar (task due dates and sprint schedules)
- Settings (profile + organization settings)

Technology
- Backend: Node.js / TypeScript
- Database: Supabase (Postgres) with Row-Level Security (RLS)
- Frontend: Next.js + React + TypeScript
- Auth: Supabase Auth
- Hosting: Vercel (frontend) + Supabase (DB)
