-- Remember the last active board column when unfinished work leaves a closed sprint,
-- so re-adding the task to a new sprint can restore To Do / In Progress / In Review.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS last_sprint_workflow_stage_id UUID
    REFERENCES public.workflow_stages(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tasks.last_sprint_workflow_stage_id IS
  'Workflow stage the task was in when its sprint closed (non-done, non-backlog). Used to restore column on next sprint assignment.';

CREATE OR REPLACE FUNCTION public.scrum_sprint_on_close_return_unfinished()
RETURNS TRIGGER AS $$
DECLARE
  v_backlog_stage_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'closed' THEN
    SELECT ws.id
      INTO v_backlog_stage_id
    FROM public.workflow_stages ws
    WHERE ws.phase_id = NEW.phase_id
      AND ws.is_backlog = true
    ORDER BY ws.stage_order ASC
    LIMIT 1;

    IF v_backlog_stage_id IS NOT NULL THEN
      UPDATE public.tasks t
      SET
        last_sprint_workflow_stage_id = CASE
          WHEN ws.is_backlog IS NOT TRUE AND ws.is_done IS NOT TRUE THEN t.workflow_stage_id
          ELSE t.last_sprint_workflow_stage_id
        END,
        sprint_id = NULL,
        workflow_stage_id = v_backlog_stage_id
      FROM public.workflow_stages ws
      WHERE t.sprint_id = NEW.id
        AND t.completed_at IS NULL
        AND ws.id = t.workflow_stage_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
