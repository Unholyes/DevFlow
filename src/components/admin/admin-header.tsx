'use client'

import { supabase } from '@/lib/supabase/client'
import { Shield } from 'lucide-react'
import { useState, useEffect } from 'react'

export function AdminHeader() {
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email ?? null)
      }
    }
    getUser()
  }, [])

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 text-lg">DevFlow Admin</h1>
          <p className="text-xs text-gray-500">Platform Management</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{userEmail || 'Loading...'}</p>
          <p className="text-xs text-purple-600 font-medium">Super Admin</p>
        </div>
      </div>
    </header>
  )
}
