-- In-app user notifications (org-scoped, per recipient)

BEGIN;

CREATE TYPE public.notification_type_enum AS ENUM (
  'task_assigned',
  'task_comment',
  'phase_completed'
);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type public.notification_type_enum NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_notifications_recipient_created_idx
  ON public.user_notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_notifications_recipient_unread_idx
  ON public.user_notifications (recipient_id)
  WHERE read_at IS NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recipients can view own notifications" ON public.user_notifications;
CREATE POLICY "Recipients can view own notifications"
  ON public.user_notifications
  FOR SELECT
  USING (
    recipient_id = auth.uid()
    AND private.is_org_member(organization_id)
  );

DROP POLICY IF EXISTS "Recipients can mark own notifications read" ON public.user_notifications;
CREATE POLICY "Recipients can mark own notifications read"
  ON public.user_notifications
  FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

COMMIT;
