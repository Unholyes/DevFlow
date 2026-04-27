'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CreateOrganizationModal } from '@/components/organization/create-organization-modal'
import { AlertCircle, Building2, CheckCircle, Clock, RefreshCw, XCircle } from 'lucide-react'

interface Application {
  id: string
  organization_name: string
  status: 'pending' | 'approved' | 'declined' | 'revision_requested'
  revision_notes: string | null
  submitted_at: string
  reviewed_at: string | null
}

export function OnboardingPageContent() {
  const [application, setApplication] = useState<Application | null>(null)
  const [loadingApplication, setLoadingApplication] = useState(true)
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const fetchApplication = async () => {
    setLoadingApplication(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoadingApplication(false)
      return
    }

    setUserEmail(user.email ?? null)

    const { data: apps } = await supabase
      .from('organization_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)

    if (apps && apps.length > 0) setApplication(apps[0])
    else setApplication(null)

    setLoadingApplication(false)
  }

  useEffect(() => {
    fetchApplication()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await supabase.auth.signOut()
      window.location.href = '/auth/login'
    } finally {
      setIsSigningOut(false)
    }
  }

  const getCardStyles = (status: Application['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 border border-green-200'
      case 'declined':
        return 'bg-red-50 border border-red-200'
      case 'revision_requested':
        return 'bg-orange-50 border border-orange-200'
      default:
        return 'bg-yellow-50 border border-yellow-200'
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Set up your organization</h1>
              <p className="mt-2 text-gray-600">
                DevFlow is organization-based. Submit your organization application to get approved and access your tenant
                workspace.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </Button>
          </div>

          {loadingApplication ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-600">Loading…</div>
          ) : application ? (
            <div className={`rounded-lg p-6 ${getCardStyles(application.status)}`}>
              <div className="flex items-start gap-4">
                {application.status === 'pending' && <Clock className="h-6 w-6 text-yellow-600 flex-shrink-0" />}
                {application.status === 'approved' && <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />}
                {application.status === 'declined' && <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />}
                {application.status === 'revision_requested' && (
                  <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0" />
                )}

                <div className="flex-1">
                  <h2 className="font-semibold text-lg mb-1">
                    {application.status === 'pending' && 'Application under review'}
                    {application.status === 'approved' && 'Application approved'}
                    {application.status === 'declined' && 'Application declined'}
                    {application.status === 'revision_requested' && 'Revision requested'}
                  </h2>

                  <p className="text-sm text-gray-700 mb-3">
                    {application.status === 'pending' &&
                      'Your organization application is being reviewed by a super admin.'}
                    {application.status === 'approved' &&
                      'Your organization was approved. You can now access your tenant workspace via your organization subdomain.'}
                    {application.status === 'declined' &&
                      'Your application was declined. You may submit a new application.'}
                    {application.status === 'revision_requested' &&
                      'A super admin requested revisions. Please review the notes and resubmit.'}
                  </p>

                  {application.status === 'revision_requested' && application.revision_notes && (
                    <div className="bg-white rounded p-3 mb-3 border border-orange-200">
                      <p className="text-sm font-medium text-gray-700">Revision notes</p>
                      <p className="text-sm text-gray-600">{application.revision_notes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Submitted: {new Date(application.submitted_at).toLocaleDateString()}</span>
                    {application.reviewed_at && (
                      <span>Reviewed: {new Date(application.reviewed_at).toLocaleDateString()}</span>
                    )}
                  </div>

                  {(application.status === 'declined' || application.status === 'revision_requested') && (
                    <Button
                      onClick={() => setIsCreateOrgModalOpen(true)}
                      className="mt-4"
                      variant={application.status === 'revision_requested' ? 'default' : 'outline'}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resubmit application
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Building2 className="h-6 w-6 text-purple-600 flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="font-semibold text-lg mb-1">Create an organization application</h2>
                  <p className="text-sm text-purple-700 mb-3">
                    Once approved, you’ll become a tenant admin and can invite your team.
                  </p>
                  <Button onClick={() => setIsCreateOrgModalOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                    Apply now
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateOrganizationModal
        open={isCreateOrgModalOpen}
        onOpenChange={setIsCreateOrgModalOpen}
        userEmail={userEmail || undefined}
        onSubmitted={fetchApplication}
      />
    </>
  )
}

