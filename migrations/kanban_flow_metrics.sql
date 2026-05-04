-- Kanban flow: column aging, optional T-shirt size & class of service (no story points required).
-- Run in Supabase SQL editor after review.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS current_stage_entered_at TIMESTAMPTZ;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS size_band TEXT;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS service_class TEXT DEFAULT 'standard';

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_size_band_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_size_band_check
  CHECK (size_band IS NULL OR size_band IN ('xs', 's', 'm', 'l', 'xl'));

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_service_class_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_service_class_check
  CHECK (service_class IS NULL OR service_class IN ('standard', 'fixed_date', 'expedite'));

COMMENT ON COLUMN public.tasks.current_stage_entered_at IS 'When the task entered its current workflow_stage (column aging).';
COMMENT ON COLUMN public.tasks.size_band IS 'Optional T-shirt size for Kanban triage.';
COMMENT ON COLUMN public.tasks.service_class IS 'Class of service: standard, fixed_date, expedite.';

UPDATE public.tasks
SET current_stage_entered_at = COALESCE(updated_at, created_at)
WHERE current_stage_entered_at IS NULL;
