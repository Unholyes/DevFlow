-- 1. Ensure `roles` array exists and captures the primary `role` if empty
UPDATE public.organization_members
SET roles = ARRAY[role]
WHERE roles IS NULL OR array_length(roles, 1) IS NULL;

-- 2. Append the `role` to the `roles` array if it isn't already in it
UPDATE public.organization_members
SET roles = array_append(roles, role)
WHERE role IS NOT NULL AND NOT (role = ANY(roles));

-- 3. Drop the redundant `role` column
ALTER TABLE public.organization_members DROP COLUMN role;