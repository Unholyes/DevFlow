-- Kanban WIP limits should apply when the *process* is Kanban, even if the parent SDLC phase
-- uses another methodology (hybrid phases). Falls back to phase methodology when process_id is null.

CREATE OR REPLACE FUNCTION public.enforce_kanban_wip_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_wip_limit INTEGER;
  v_methodology public.sdlc_methodology_enum;
  v_open_tasks_count INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.workflow_stage_id = OLD.workflow_stage_id THEN
    RETURN NEW;
  END IF;

  SELECT ws.wip_limit
    INTO v_wip_limit
  FROM public.workflow_stages ws
  WHERE ws.id = NEW.workflow_stage_id;

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
        AND t.completed_at IS NULL;
    ELSE
      SELECT COUNT(*)
        INTO v_open_tasks_count
      FROM public.tasks t
      WHERE t.workflow_stage_id = NEW.workflow_stage_id
        AND t.completed_at IS NULL
        AND t.id <> OLD.id;
    END IF;

    IF v_open_tasks_count >= v_wip_limit THEN
      RAISE EXCEPTION 'Kanban WIP limit exceeded (stage_id=%, limit=%)', NEW.workflow_stage_id, v_wip_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
