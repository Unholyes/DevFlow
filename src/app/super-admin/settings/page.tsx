'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function SuperAdminSettingsPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser()
      setEmail(data.user?.email ?? null)
      setLoading(false)
    }
    run()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Super admin preferences and quick actions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Account</h2>
          <p className="mt-1 text-sm text-gray-500">Signed in as</p>
          <p className="mt-3 text-sm font-medium text-gray-900">
            {loading ? 'Loading…' : email || 'Unknown'}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/super-admin/dashboard">Go to dashboard</Link>
            </Button>
            <Button variant="destructive" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Admin tools</h2>
          <p className="mt-1 text-sm text-gray-500">
            Quick navigation to common super-admin tasks.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/super-admin/tenants">Manage tenants</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/super-admin/applications">Review applications</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/super-admin/overview">View overview</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

