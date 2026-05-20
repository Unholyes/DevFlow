-- Ensure project/sprint title indexes are removed; only phase-scoped uniqueness remains.

DROP INDEX IF EXISTS public.tasks_project_title_unique_idx;
DROP INDEX IF EXISTS public.tasks_sprint_title_unique_idx;

UPDATE public.tasks t
SET phase_id = ws.phase_id
FROM public.workflow_stages ws
WHERE ws.id = t.workflow_stage_id
  AND (t.phase_id IS NULL OR t.phase_id <> ws.phase_id);

CREATE UNIQUE INDEX IF NOT EXISTS tasks_phase_title_unique_idx
  ON public.tasks (phase_id, lower(btrim(title)))
  WHERE phase_id IS NOT NULL;
