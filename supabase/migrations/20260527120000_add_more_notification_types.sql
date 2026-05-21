-- Migration: Add additional values to the notification type enum
-- These types represent all new notification scenarios for owners and members

-- We execute these outside of transaction blocks if needed, but ALTER TYPE ADD VALUE in Postgres can be run within a transaction starting from version 12 in most cases, or simple direct execution.
-- Since Supabase migrations might run in a single transaction, we do standard ALTER TYPE.

ALTER TYPE public.project_status_enum ADD VALUE IF NOT EXISTS 'completed';

ALTER TYPE public.notification_type_enum ADD VALUE IF NOT EXISTS 'project_completed';
ALTER TYPE public.notification_type_enum ADD VALUE IF NOT EXISTS 'process_completed';
ALTER TYPE public.notification_type_enum ADD VALUE IF NOT EXISTS 'task_created';
ALTER TYPE public.notification_type_enum ADD VALUE IF NOT EXISTS 'task_deleted';
ALTER TYPE public.notification_type_enum ADD VALUE IF NOT EXISTS 'task_edited';
ALTER TYPE public.notification_type_enum ADD VALUE IF NOT EXISTS 'team_added';
ALTER TYPE public.notification_type_enum ADD VALUE IF NOT EXISTS 'role_adjusted';
ALTER TYPE public.notification_type_enum ADD VALUE IF NOT EXISTS 'assigned_project';
ALTER TYPE public.notification_type_enum ADD VALUE IF NOT EXISTS 'assigned_phase';
ALTER TYPE public.notification_type_enum ADD VALUE IF NOT EXISTS 'assigned_process';
