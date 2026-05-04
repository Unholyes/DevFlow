-- Fix: accept_team_invitation parameter name conflicted with organization_members.user_id
-- which caused "column reference user_id is ambiguous".

CREATE OR REPLACE FUNCTION public.accept_team_invitation(invitation_token TEXT, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get invitation details
  SELECT *
    INTO invitation_record
  FROM public.team_invitations
  WHERE token = invitation_token
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired invitation');
  END IF;

  -- Update invitation status
  UPDATE public.team_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = invitation_record.id;

  -- Add user to organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (invitation_record.organization_id, p_user_id, 'member')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN json_build_object('success', true, 'organization_id', invitation_record.organization_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

