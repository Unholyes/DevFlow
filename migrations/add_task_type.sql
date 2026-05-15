-- Work item type for Jira-style icons on cards (task, bug, story, epic, subtask).
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'task';

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_task_type_check
  CHECK (task_type IN ('task', 'bug', 'story', 'epic', 'subtask'));

COMMENT ON COLUMN public.tasks.task_type IS 'Work item type for UI: task, bug, story, epic, subtask.';
