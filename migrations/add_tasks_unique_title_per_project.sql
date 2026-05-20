-- Mirror of supabase/migrations/20260520150000_tasks_unique_title_per_project.sql

DROP INDEX IF EXISTS public.tasks_sprint_title_unique_idx;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, lower(btrim(title))
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.tasks
)
UPDATE public.tasks t
SET title = btrim(t.title) || ' (' || r.rn::text || ')'
FROM ranked r
WHERE t.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_project_title_unique_idx
  ON public.tasks (project_id, lower(btrim(title)));
