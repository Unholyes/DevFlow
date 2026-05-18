-- Per-process Kanban policy: when enabled, blocked/impeded tasks do not count toward WIP limits.

ALTER TABLE public.phase_processes
  ADD COLUMN IF NOT EXISTS wip_exclude_blocked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.phase_processes.wip_exclude_blocked IS
  'When true, tasks with blocked=true are excluded from Kanban WIP limit counts for this process.';

CREATE OR REPLACE FUNCTION public.enforce_kanban_wip_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_wip_limit INTEGER;
  v_is_done BOOLEAN;
  v_is_backlog BOOLEAN;
  v_exclude_blocked BOOLEAN;
  v_methodology public.sdlc_methodology_enum;
  v_open_tasks_count INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.workflow_stage_id = OLD.workflow_stage_id THEN
    RETURN NEW;
  END IF;

  SELECT ws.wip_limit, ws.is_done, ws.is_backlog
    INTO v_wip_limit, v_is_done, v_is_backlog
  FROM public.workflow_stages ws
  WHERE ws.id = NEW.workflow_stage_id;

  IF v_is_done OR v_is_backlog THEN
    RETURN NEW;
  END IF;

  v_exclude_blocked := false;
  IF NEW.process_id IS NOT NULL THEN
    SELECT COALESCE(pp.wip_exclude_blocked, false)
      INTO v_exclude_blocked
    FROM public.phase_processes pp
    WHERE pp.id = NEW.process_id;
  END IF;

  v_methodology := NULL;

  IF NEW.process_id IS NOT NULL THEN
    SELECT pp.methodology
      INTO v_methodology
    FROM public.phase_processes pp
    WHERE pp.id = NEW.process_id;
  END IF;

  IF v_methodology IS NULL THEN
    SELECT sp.methodology
      INTO v_methodology
    FROM public.workflow_stages ws
    JOIN public.sdlc_phases sp ON sp.id = ws.phase_id
    WHERE ws.id = NEW.workflow_stage_id;
  END IF;

  IF v_methodology = 'kanban' AND v_wip_limit IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      SELECT COUNT(*)
        INTO v_open_tasks_count
      FROM public.tasks t
      WHERE t.workflow_stage_id = NEW.workflow_stage_id
        AND t.completed_at IS NULL
        AND (NOT v_exclude_blocked OR t.blocked IS NOT TRUE);
    ELSE
      SELECT COUNT(*)
        INTO v_open_tasks_count
      FROM public.tasks t
      WHERE t.workflow_stage_id = NEW.workflow_stage_id
        AND t.completed_at IS NULL
        AND t.id <> OLD.id
        AND (NOT v_exclude_blocked OR t.blocked IS NOT TRUE);
    END IF;

    IF v_open_tasks_count >= v_wip_limit THEN
      RAISE EXCEPTION 'Kanban WIP limit exceeded (stage_id=%, limit=%)', NEW.workflow_stage_id, v_wip_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
