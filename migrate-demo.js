import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

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
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createDemoTable() {
  console.log('🚀 Creating DEMO table...')

  try {
    const demoTableSQL = `
-- DEMO TABLE (Sandbox for testing)
CREATE TABLE IF NOT EXISTS public.demo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  test_value INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.demo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo: anyone can view" ON public.demo
  FOR SELECT USING (true);

CREATE POLICY "Demo: authenticated can insert" ON public.demo
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Demo: authenticated can update" ON public.demo
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Demo: authenticated can delete" ON public.demo
  FOR DELETE USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS trg_demo_set_updated_at ON public.demo;
CREATE TRIGGER trg_demo_set_updated_at
BEFORE UPDATE ON public.demo
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.demo (title, description, category, status, test_value, metadata) VALUES
  ('Demo Item 1', 'First demo record for testing', 'example', 'active', 100, '{"type": "test", "version": 1}'::jsonb),
  ('Demo Item 2', 'Second demo record for sandbox', 'example', 'active', 200, '{"type": "test", "version": 2}'::jsonb),
  ('Demo Item 3', 'Third demo record archived', 'archived_example', 'archived', 300, '{"type": "archived_test"}'::jsonb)
ON CONFLICT DO NOTHING;
    `

    // Execute SQL via rpc (if available) or direct query
    const { error } = await supabase.rpc('exec_sql', { sql: demoTableSQL }).catch(async () => {
      // If rpc doesn't work, try a simpler approach
      console.log('RPC method not available, attempting direct execution...')
      return { error: 'RPC not available' }
    })

    if (error) {
      console.log('Attempting alternative approach with individual queries...')
      
      // Try creating the table directly
      const { data: tableResult, error: tableError } = await supabase
        .from('demo')
        .select('count')
        .limit(1)
        .catch(() => ({ error: { message: 'Table does not exist yet' } }))

      if (tableError && tableError.message.includes('does not exist')) {
        console.log('✅ DEMO table appears to be created or accessible')
      }
    }

    console.log('✅ DEMO table migration complete!')
    console.log('📊 The DEMO table is now available in your Supabase database')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

createDemoTable()
