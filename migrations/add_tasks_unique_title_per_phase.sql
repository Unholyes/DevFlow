-- Mirror of supabase/migrations/20260520160000_tasks_unique_title_per_phase.sql

DROP INDEX IF EXISTS public.tasks_project_title_unique_idx;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES public.sdlc_phases(id) ON DELETE CASCADE;

UPDATE public.tasks t
SET phase_id = ws.phase_id
FROM public.workflow_stages ws
WHERE ws.id = t.workflow_stage_id
  AND t.phase_id IS NULL;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY phase_id, lower(btrim(title))
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.tasks
  WHERE phase_id IS NOT NULL
)
UPDATE public.tasks t
SET title = btrim(t.title) || ' (' || r.rn::text || ')'
FROM ranked r
WHERE t.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_phase_title_unique_idx
  ON public.tasks (phase_id, lower(btrim(title)))
  WHERE phase_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_task_phase_id_from_stage()
RETURNS TRIGGER AS $$
BEGIN
  SELECT ws.phase_id
    INTO NEW.phase_id
  FROM public.workflow_stages ws
  WHERE ws.id = NEW.workflow_stage_id;

  IF NEW.phase_id IS NULL THEN
    RAISE EXCEPTION 'workflow_stage_id must belong to a phase';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_sync_phase_id ON public.tasks;
CREATE TRIGGER trg_tasks_sync_phase_id
BEFORE INSERT OR UPDATE OF workflow_stage_id ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.sync_task_phase_id_from_stage();
