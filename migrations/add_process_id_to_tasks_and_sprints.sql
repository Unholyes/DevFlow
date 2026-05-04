-- Add process scoping for hybrid phases.
-- Links tasks + sprints to a specific phase_processes row.

-- 1) Add nullable process_id columns
ALTER TABLE public.sprints
ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES public.phase_processes(id) ON DELETE SET NULL;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES public.phase_processes(id) ON DELETE SET NULL;

-- 2) Backfill existing rows to the first process in each phase (order_index = 0)
-- Sprints can be mapped directly via phase_id.
UPDATE public.sprints s
SET process_id = p.id
FROM public.phase_processes p
WHERE s.process_id IS NULL
  AND p.phase_id = s.phase_id
  AND p.order_index = 0;

-- Tasks do not store phase_id directly; infer it via workflow_stage -> sdlc_phases,
-- then map to the first process for that phase.
UPDATE public.tasks t
SET process_id = p.id
FROM public.workflow_stages ws
JOIN public.phase_processes p
  ON p.phase_id = ws.phase_id
 AND p.order_index = 0
WHERE t.process_id IS NULL
  AND ws.id = t.workflow_stage_id;

-- 3) Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_sprints_phase_process
  ON public.sprints (phase_id, process_id);

CREATE INDEX IF NOT EXISTS idx_tasks_process
  ON public.tasks (process_id);

