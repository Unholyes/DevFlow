-- Task titles unique per process (case-insensitive), not per phase or project.

DROP INDEX IF EXISTS public.tasks_phase_title_unique_idx;
DROP INDEX IF EXISTS public.tasks_project_title_unique_idx;
DROP INDEX IF EXISTS public.tasks_sprint_title_unique_idx;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY process_id, lower(btrim(title))
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.tasks
  WHERE process_id IS NOT NULL
)
UPDATE public.tasks t
SET title = btrim(t.title) || ' (' || r.rn::text || ')'
FROM ranked r
WHERE t.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_process_title_unique_idx
  ON public.tasks (process_id, lower(btrim(title)))
  WHERE process_id IS NOT NULL;
