-- DevFlow Multi-Tenant Database Schema
-- Run this SQL in your Supabase SQL Editor

-- =========================================
-- PROFILES TABLE (extends auth.users)
-- =========================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'team_member' CHECK (role IN ('super_admin', 'tenant_admin', 'team_member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- =========================================
-- ORGANIZATIONS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON public.organizations
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Only authenticated users can create organizations" ON public.organizations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Organization owners can update their organizations" ON public.organizations
  FOR UPDATE USING (auth.uid() = owner_id);

-- =========================================
-- ORGANIZATION MEMBERS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Organization members policies
CREATE POLICY "Users can view members of organizations they belong to" ON public.organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = organization_members.organization_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage members" ON public.organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = organization_members.organization_id
      AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- =========================================
-- TEAM INVITATIONS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Team invitations policies
CREATE POLICY "Organization members can view invitations" ON public.team_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = team_invitations.organization_id
      AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = team_invitations.organization_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can create invitations" ON public.team_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = team_invitations.organization_id
      AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = team_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY "Organization admins can update invitations" ON public.team_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = team_invitations.organization_id
      AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = team_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- =========================================
-- TRIGGER FUNCTION FOR NEW USER SIGNUP
-- =========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'team_member')
  );

  -- If user is a tenant_admin, create their organization
  IF NEW.raw_user_meta_data->>'role' = 'tenant_admin' THEN
    INSERT INTO public.organizations (name, owner_id)
    VALUES (
      NEW.raw_user_meta_data->>'organization_name',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- UTILITY FUNCTIONS
-- =========================================

-- Function to generate secure invitation tokens
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION public.accept_team_invitation(invitation_token TEXT, user_id UUID)
RETURNS JSON AS $$
DECLARE
  invitation_record RECORD;
  result JSON;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM public.team_invitations
  WHERE token = invitation_token AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired invitation');
  END IF;

  -- Update invitation status
  UPDATE public.team_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = invitation_record.id;

  -- Add user to organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (invitation_record.organization_id, user_id, 'member')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN json_build_object('success', true, 'organization_id', invitation_record.organization_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;