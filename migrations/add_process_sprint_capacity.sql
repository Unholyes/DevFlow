-- Store sprint capacity per process (Scrum).
ALTER TABLE public.phase_processes
ADD COLUMN IF NOT EXISTS sprint_capacity_points INTEGER NOT NULL DEFAULT 42;

-- Basic sanity constraint (optional but useful)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'phase_processes_sprint_capacity_points_check'
  ) THEN
    ALTER TABLE public.phase_processes
    ADD CONSTRAINT phase_processes_sprint_capacity_points_check
    CHECK (sprint_capacity_points >= 1 AND sprint_capacity_points <= 1000);
  END IF;
END $$;

