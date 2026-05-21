-- Migration to add completed_by_id and updated_by_id to public.tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
