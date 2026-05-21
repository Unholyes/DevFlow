-- Add 'coordinator' role to team_members constraint

BEGIN;

-- Drop the existing check constraint
ALTER TABLE public.team_members
DROP CONSTRAINT IF EXISTS team_members_role_check;

-- Add new constraint that includes 'coordinator'
ALTER TABLE public.team_members
ADD CONSTRAINT team_members_role_check CHECK (team_role IN ('lead', 'coordinator', 'member'));

COMMIT;
