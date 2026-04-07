// Test script to verify database setup
// Run this in browser console after logging in

import { supabase } from './lib/supabase/client'

async function testDatabase() {
  console.log('🧪 Testing database setup...')

  // Test 1: Check if we can access tables
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (profilesError) {
      console.error('❌ Profiles table error:', profilesError)
    } else {
      console.log('✅ Profiles table accessible')
    }

    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)

    if (orgsError) {
      console.error('❌ Organizations table error:', orgsError)
    } else {
      console.log('✅ Organizations table accessible')
    }

  } catch (error) {
    console.error('❌ Database connection error:', error)
  }
}

// Run test
testDatabase()