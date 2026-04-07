Brief Description of the Project
         This project seeks to develop a multi-tenant Software-as-a-Service (SaaS) project management system tailored for software development teams, providing a structured and configurable environment for planning, tracking, and managing development projects across different methodologies.
This project seeks to build a platform that allows organizations to manage their software development workflows by selecting and configuring Software Development Life Cycle (SDLC) methodologies per project, enabling teams to work in a structured, role-driven, and methodology-appropriate environment.

Main goal of the system is to:
Provide organizations with isolated and secure workspaces for managing their software development projects.
Allow tenant administrators to configure project workflows based on a chosen SDLC methodology (Scrum, Kanban, Waterfall, DevOps, etc).
Enable development teams to collaborate, track, and complete tasks within a structured and role-driven project environment.


Specific functions of the system are as follows:
Super Administrator Side:
Super Admin Authentication: Secure login for platform owners.

Manage Tenant Accounts:
Super Admin can view all registered tenant organizations (workspaces).
Super Admin can suspend, activate, or delete tenant accounts.
Super Admin can monitor platform-wide usage statistics (e.g., active tenants, total users, total projects).

Tenant Administrator Side
Tenant Administrator Authentication: Secure login for organization owners.

Manage the Organization Workspace:
Tenant Administrator will set up and name the organization workspace upon registration.
Tenant Administrator will invite team members via email.
Tenant Administrator will manage access and assign users to the general "Developers / Team Members" role.
Tenant Administrator can remove members from the workspace.
Tenant Administrator can update overall workspace settings.

Manage Project Members:
Tenant Administrator can assign workspace members to specific projects.

Monitor Workspace Overview:
Tenant Administrator can view a dashboard showing all active projects and their current overall status.
Tenant Administrator can view all workspace members and identify which projects they belong to.

Developers / Team Members Side
Team Member Authentication: Secure login for developers and general project members.

Manage Project Tasks:
Team Members will create projects within the workspace.
Team Members can archive or delete projects.
Team Members will create tasks and define task details (title, description, priority, due date).
Team Members will assign tasks to themselves or other team members.
Team Members can update or delete tasks.
Team Members can set task priority levels (Low, Medium, High, Critical).
Team Members can mark a task as blocked and specify the reason/add comments to keep the team informed.
Team Members can filter and search tasks by status, priority, assignee, or due date.
Team Members will update task statuses by moving them through the configured workflow stages (e.g., To Do → In Progress → In Review → Done).
Team Members can mark a task as complete once all work is finished.

Manage Hybrid SDLC-Specific Workflows:
Team Members can configure the project to utilize different SDLC methodologies at different phases, maintaining the specific rules of the active framework:
For Scrum phases: Team Members will manage the product backlog, prioritize items, assign story points, create sprints, set sprint duration, move backlog items into a sprint, and automatically move unfinished tasks back to the backlog upon sprint closure.
For Waterfall phases: Team Members will define sequential project phases and enforce phase completion before allowing progression to the next phase.
For Kanban phases: Team Members will configure board columns and set/manage strict WIP (Work In Progress) limits.
For DevOps phases: Team Members will define pipeline stages and track tasks continuously from planning through deployment.

View Project Boards:
Team Members can switch views based on the active SDLC configurations (Kanban board, Scrum sprint board, Waterfall phase view, DevOps pipeline view).

Monitor Project Progress:
Team Members can view the overall project status and task completion rates on a centralized project dashboard.
Team Members can view team workloads, showing how many tasks each member currently has assigned.
Team Members can view a burndown chart for active Scrum sprints showing tasks completed versus tasks remaining

Manage the Project Calendar:
Team Members will set task due dates and sprint schedules visible on the calendar.
Team Members can view all upcoming deadlines, milestones, and personal schedules in the shared calendar view.

Manage Profile:
Team Members can update their own profile information.

Technology:
Backend: Node.js / TypeScript 
Database: Supabase (Postgres) with Row-Level Security
Frontend: Next.js + React + TypeScript
Auth: Supabase Auth 
Hosting: Vercel (frontend) + Supabase (DB) 
