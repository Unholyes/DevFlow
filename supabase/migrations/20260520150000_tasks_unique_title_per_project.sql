-- Task titles must be unique within a project (case-insensitive), not per sprint.

DROP INDEX IF EXISTS public.tasks_sprint_title_unique_idx;

-- Resolve existing duplicates (keep oldest task title; suffix others).
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
