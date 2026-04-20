'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, FolderKanban, Search, MoreVertical, Ban, CheckCircle, Trash2, Edit } from 'lucide-react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface Organization {
  id: string
  name: string
  created_at: string
  updated_at: string
  owner: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
  }
  organization_members: { count: number }
  projects: { count: number }
}

export default function TenantsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: string }>({ open: false, action: '' })
  const [editDialog, setEditDialog] = useState<{ open: boolean; org: Organization | null }>({ open: false, org: null })
  const [editName, setEditName] = useState('')

  useEffect(() => {
    fetchOrganizations()
  }, [page, search])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      })

      const response = await fetch(`/api/admin/tenants?${params}`)
      const data = await response.json()

      if (response.ok) {
        setOrganizations(data.organizations)
        setTotalPages(data.pagination.totalPages)
      } else {
        console.error('Error fetching organizations:', data.error)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async (org: Organization) => {
    setSelectedOrg(org)
    setActionDialog({ open: true, action: 'suspend' })
  }

  const handleActivate = async (org: Organization) => {
    setSelectedOrg(org)
    setActionDialog({ open: true, action: 'activate' })
  }

  const handleDelete = async (org: Organization) => {
    setSelectedOrg(org)
    setActionDialog({ open: true, action: 'delete' })
  }

  const handleEdit = (org: Organization) => {
    setSelectedOrg(org)
    setEditName(org.name)
    setEditDialog({ open: true, org })
  }

  const confirmAction = async () => {
    if (!selectedOrg) return

    try {
      let endpoint = ''
      if (actionDialog.action === 'suspend') {
        endpoint = `/api/admin/tenants/${selectedOrg.id}/suspend`
      } else if (actionDialog.action === 'activate') {
        endpoint = `/api/admin/tenants/${selectedOrg.id}/activate`
      } else if (actionDialog.action === 'delete') {
        endpoint = `/api/admin/tenants/${selectedOrg.id}`
      }

      const response = await fetch(endpoint, {
        method: actionDialog.action === 'delete' ? 'DELETE' : 'POST',
      })

      if (response.ok) {
        setActionDialog({ open: false, action: '' })
        setSelectedOrg(null)
        fetchOrganizations()
      } else {
        const data = await response.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error performing action:', error)
      alert('An error occurred')
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedOrg) return

    try {
      const response = await fetch(`/api/admin/tenants/${selectedOrg.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editName }),
      })

      if (response.ok) {
        setEditDialog({ open: false, org: null })
        setSelectedOrg(null)
        fetchOrganizations()
      } else {
        const data = await response.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating organization:', error)
      alert('An error occurred')
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tenants</h1>
        <p className="mt-2 text-gray-600">
          Manage all tenant organizations on the platform
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No organizations found
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{org.name}</p>
                        <p className="text-sm text-gray-500">{org.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">
                        {org.owner.full_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-500">{org.owner.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{org.organization_members.count}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{org.projects.count}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-500">
                      {new Date(org.created_at).toLocaleDateString()}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(org)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSuspend(org)}>
                          <Ban className="h-4 w-4 mr-2" />
                          Suspend
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleActivate(org)}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Activate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(org)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open: boolean) => setActionDialog({ open, action: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'suspend' && 'Suspend Organization'}
              {actionDialog.action === 'activate' && 'Activate Organization'}
              {actionDialog.action === 'delete' && 'Delete Organization'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'suspend' &&
                `Are you sure you want to suspend ${selectedOrg?.name}? This will prevent the owner from accessing their account.`}
              {actionDialog.action === 'activate' &&
                `Are you sure you want to activate ${selectedOrg?.name}?`}
              {actionDialog.action === 'delete' &&
                `Are you sure you want to delete ${selectedOrg?.name}? This action cannot be undone and will delete all associated data.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, action: '' })}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === 'delete' ? 'destructive' : 'default'}
              onClick={confirmAction}
            >
              {actionDialog.action === 'suspend' && 'Suspend'}
              {actionDialog.action === 'activate' && 'Activate'}
              {actionDialog.action === 'delete' && 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open: boolean) => setEditDialog({ open, org: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update the organization name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter organization name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, org: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
