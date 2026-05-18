-- Draft sprints: proposed by users with sdlc.sprints.create; approved via pm.sprints.manage.

ALTER TYPE public.sprint_status_enum ADD VALUE IF NOT EXISTS 'draft';

ALTER TABLE public.sprints
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL;
