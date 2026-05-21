-- Soft-archive completed Kanban work items (hidden from board/backlog, listed on process archive).

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tasks.archived_at IS
  'When set, the task is hidden from the active board/backlog but kept in the process archive.';

DROP INDEX IF EXISTS public.tasks_process_title_unique_idx;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_process_title_unique_idx
  ON public.tasks (process_id, lower(btrim(title)))
  WHERE process_id IS NOT NULL AND archived_at IS NULL;
