import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env.local file
const envContent = readFileSync('.env.local', 'utf8')
const envLines = envContent.split('\n')
const envVars = {}

envLines.forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '***' : 'undefined')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupDatabase() {
  console.log('🚀 Setting up DevFlow database schema...')

  try {
    // Create organizations table
    console.log('📋 Creating organizations table...')
    const { error: orgError } = await supabase.from('_supabase_migrations').select('*').limit(1)

    if (orgError) {
      console.log('Using direct SQL execution...')

      // Since we can't use rpc('exec_sql'), let's try direct table creation
      // This might not work with RLS policies, but let's try basic table creation first
      const createOrgSQL = `
        CREATE TABLE IF NOT EXISTS public.organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          owner_id UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `

      console.log('Creating organizations table...')
      // We can't execute raw SQL directly, so let's use the REST API approach
      // For now, let's create a simpler approach - create tables using the Supabase dashboard
      // or use a different method
    }

    if (orgError) {
      console.error('❌ Error creating organizations table:', orgError)
      return
    }

    // Create organization_members table
    console.log('👥 Creating organization_members table...')
    const { error: memberError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.organization_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          role TEXT DEFAULT 'Member' CHECK (role IN ('Admin', 'Project Manager', 'Member')),
          roles TEXT[] NOT NULL DEFAULT ARRAY['Member']::text[],
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
              AND om.role = 'Admin'
            )
          );
      `
    })

    if (memberError) {
      console.error('❌ Error creating organization_members table:', memberError)
      return
    }

    // Create team_invitations table
    console.log('📧 Creating team_invitations table...')
    const { error: inviteError } = await supabase.rpc('exec_sql', {
      sql: `
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
              AND om.role = 'Admin'
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
              AND om.role = 'Admin'
            )
          );
      `
    })

    if (inviteError) {
      console.error('❌ Error creating team_invitations table:', inviteError)
      return
    }

    // Create profiles table (extends auth.users)
    console.log('👤 Creating profiles table...')
    const { error: profileError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    })

    if (profileError) {
      console.error('❌ Error creating profiles table:', profileError)
      return
    }

    // Create function to handle new user signup
    console.log('⚙️ Creating user signup handler...')
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    })

    if (functionError) {
      console.error('❌ Error creating user handler:', functionError)
      return
    }

    console.log('✅ Database schema setup complete!')

  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

// Run the setup
setupDatabase()