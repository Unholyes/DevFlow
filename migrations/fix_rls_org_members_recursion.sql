-- Fix RLS infinite recursion involving organization_members.
-- Error observed: 42P17 infinite recursion detected in policy for relation "organization_members"

-- Create a non-exposed schema for security definer helpers.
create schema if not exists private;

-- SECURITY DEFINER helpers.
-- Note: do NOT put SECURITY DEFINER functions in an exposed schema (e.g. public).

create or replace function private.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_org_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function private.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_org_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
  );
$$;

create or replace function private.is_org_owner(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = p_org_id
      and o.owner_id = auth.uid()
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_admin(uuid) to authenticated;
grant execute on function private.is_org_owner(uuid) to authenticated;

-- Drop the recursive policies and recreate them without self-references.

drop policy if exists "Users can view organizations they belong to" on public.organizations;
create policy "Users can view organizations they belong to"
on public.organizations
for select
using (
  auth.uid() = owner_id
  or private.is_org_member(id)
);

drop policy if exists "Users can view members of organizations they belong to" on public.organization_members;
create policy "Users can view members of organizations they belong to"
on public.organization_members
for select
using (
  private.is_org_owner(organization_id)
  or private.is_org_member(organization_id)
);

drop policy if exists "Organization admins can manage members" on public.organization_members;

create policy "Organization admins can insert members"
on public.organization_members
for insert
with check (
  private.is_org_owner(organization_id)
  or private.is_org_admin(organization_id)
);

create policy "Organization admins can update members"
on public.organization_members
for update
using (
  private.is_org_owner(organization_id)
  or private.is_org_admin(organization_id)
);

create policy "Organization admins can delete members"
on public.organization_members
for delete
using (
  private.is_org_owner(organization_id)
  or private.is_org_admin(organization_id)
);

