-- Add support for multiple processes per SDLC phase.
CREATE TABLE IF NOT EXISTS public.phase_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES public.sdlc_phases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  methodology public.sdlc_methodology_enum NOT NULL DEFAULT 'kanban',
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (phase_id, order_index)
);

ALTER TABLE public.phase_processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Phase processes: select members/owner" ON public.phase_processes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = phase_processes.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = phase_processes.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Phase processes: insert members/owner" ON public.phase_processes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = phase_processes.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = phase_processes.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Phase processes: update members/owner" ON public.phase_processes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = phase_processes.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = phase_processes.organization_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = phase_processes.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = phase_processes.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Phase processes: delete members/owner" ON public.phase_processes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = phase_processes.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = phase_processes.organization_id
        AND om.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_phase_processes_set_updated_at ON public.phase_processes;
CREATE TRIGGER trg_phase_processes_set_updated_at
BEFORE UPDATE ON public.phase_processes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
