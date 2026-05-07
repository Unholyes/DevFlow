-- Phase 2: optional team ownership on tasks (same org as task)

BEGIN;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_org_team_idx
  ON public.tasks (organization_id, team_id)
  WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_project_team_idx
  ON public.tasks (project_id, team_id)
  WHERE team_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tasks_team_org_matches()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = NEW.team_id
      AND t.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'tasks.team_id must reference a team in the same organization as the task'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_team_org_matches ON public.tasks;
CREATE TRIGGER trg_tasks_team_org_matches
BEFORE INSERT OR UPDATE OF team_id, organization_id
ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.tasks_team_org_matches();

COMMIT;
