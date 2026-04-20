'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Building2, Search, CheckCircle, XCircle, FileText, Calendar } from 'lucide-react'

interface Application {
  id: string
  user_id: string
  organization_name: string
  description: string
  contact_email: string
  phone_number: string | null
  website_url: string | null
  industry: string | null
  expected_team_size: string | null
  use_case: string
  status: 'pending' | 'approved' | 'declined' | 'revision_requested'
  revision_notes: string | null
  submitted_at: string
  reviewed_at: string | null
  profiles: {
    full_name: string | null
    email: string
  }
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'decline' | 'revision'>('approve')
  const [revisionNotes, setRevisionNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [statusFilter])

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const url = statusFilter === 'all' 
        ? '/api/organization-applications'
        : `/api/organization-applications?status=${statusFilter}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (response.ok) {
        setApplications(data.applications || [])
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewApplication = (application: Application) => {
    setSelectedApplication(application)
    setIsViewModalOpen(true)
  }

  const handleActionClick = (application: Application, action: 'approve' | 'decline' | 'revision') => {
    setSelectedApplication(application)
    setActionType(action)
    setRevisionNotes('')
    setIsActionModalOpen(true)
  }

  const handleActionSubmit = async () => {
    if (!selectedApplication) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/organization-applications/${selectedApplication.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          revision_notes: actionType === 'revision' ? revisionNotes : null,
        }),
      })

      if (response.ok) {
        setIsActionModalOpen(false)
        setSelectedApplication(null)
        setRevisionNotes('')
        fetchApplications()
      }
    } catch (error) {
      console.error('Error performing action:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const filteredApplications = applications.filter(app => {
    const searchLower = search.toLowerCase()
    return (
      app.organization_name.toLowerCase().includes(searchLower) ||
      app.contact_email.toLowerCase().includes(searchLower) ||
      app.profiles.email.toLowerCase().includes(searchLower)
    )
  })

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      revision_requested: 'bg-orange-100 text-orange-800',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Applications</h1>
        <p className="mt-2 text-gray-600">
          Review and manage organization applications
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search applications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="declined">Declined</option>
          <option value="revision_requested">Revision Requested</option>
        </select>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No applications found
                </TableCell>
              </TableRow>
            ) : (
              filteredApplications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="font-medium">
                    {application.organization_name}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{application.profiles.full_name || 'N/A'}</p>
                      <p className="text-sm text-gray-500">{application.profiles.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{application.industry || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(application.status)}</TableCell>
                  <TableCell>
                    {new Date(application.submitted_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewApplication(application)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {application.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleActionClick(application, 'approve')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleActionClick(application, 'decline')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleActionClick(application, 'revision')}
                          >
                            Request Revision
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Application Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Review the organization application details
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Organization Name</Label>
                  <p className="font-medium">{selectedApplication.organization_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <p>{getStatusBadge(selectedApplication.status)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Applicant Name</Label>
                  <p className="font-medium">{selectedApplication.profiles.full_name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Contact Email</Label>
                  <p className="font-medium">{selectedApplication.contact_email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Phone</Label>
                  <p className="font-medium">{selectedApplication.phone_number || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Website</Label>
                  <p className="font-medium">{selectedApplication.website_url || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Industry</Label>
                  <p className="font-medium">{selectedApplication.industry || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Expected Team Size</Label>
                  <p className="font-medium">{selectedApplication.expected_team_size || 'N/A'}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Description</Label>
                <p className="mt-1">{selectedApplication.description}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Use Case</Label>
                <p className="mt-1">{selectedApplication.use_case}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Submitted: {new Date(selectedApplication.submitted_at).toLocaleString()}
                </div>
                {selectedApplication.reviewed_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Reviewed: {new Date(selectedApplication.reviewed_at).toLocaleString()}
                  </div>
                )}
              </div>
              {selectedApplication.revision_notes && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <Label className="text-sm font-medium text-orange-800">Revision Notes</Label>
                  <p className="mt-1 text-sm">{selectedApplication.revision_notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Modal */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Application'}
              {actionType === 'decline' && 'Decline Application'}
              {actionType === 'revision' && 'Request Revision'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && 'This will create the organization and grant tenant admin privileges.'}
              {actionType === 'decline' && 'This will decline the application. The user can resubmit.'}
              {actionType === 'revision' && 'Request the applicant to provide additional information.'}
            </DialogDescription>
          </DialogHeader>
          {actionType === 'revision' && (
            <div className="space-y-2 py-4">
              <Label htmlFor="revision-notes">Revision Notes</Label>
              <Textarea
                id="revision-notes"
                placeholder="Describe what needs to be revised..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                rows={4}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsActionModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleActionSubmit}
              disabled={actionLoading || (actionType === 'revision' && !revisionNotes)}
              className={
                actionType === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : actionType === 'decline'
                  ? 'bg-red-600 hover:bg-red-700'
                  : ''
              }
            >
              {actionLoading ? 'Processing...' : actionType === 'approve' ? 'Approve' : actionType === 'decline' ? 'Decline' : 'Request Revision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
