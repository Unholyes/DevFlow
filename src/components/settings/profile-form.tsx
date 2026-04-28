'use client'

import { useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Camera, Save, X } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100, "Full name must be less than 100 characters"),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileFormProps {
  user: SupabaseUser
  profile: any // Using any for now since we don't have strict typing
  updateProfile: (formData: FormData) => Promise<{ success: boolean; error?: string }>
}

export function ProfileForm({ user, profile, updateProfile }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
    },
  })

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('full_name', data.full_name)
    let avatarUrl = profile?.avatar_url || null

    if (selectedImage) {
      try {
        setIsUploadingImage(true)

        const authResponse = await fetch('/api/imagekit/auth')
        if (!authResponse.ok) {
          throw new Error('Failed to authenticate upload')
        }

        const { token, expire, signature, publicKey } = await authResponse.json()
        const uploadFormData = new FormData()

        uploadFormData.append('file', selectedImage)
        uploadFormData.append('fileName', `avatar-${user.id}-${Date.now()}`)
        uploadFormData.append('folder', '/devflow/profile-avatars')
        uploadFormData.append('token', token)
        uploadFormData.append('expire', String(expire))
        uploadFormData.append('signature', signature)
        uploadFormData.append('publicKey', publicKey)

        const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Image upload failed')
        }

        const uploadedAsset = await uploadResponse.json()
        avatarUrl = uploadedAsset.url
      } catch (error) {
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to upload profile image',
        })
        setIsLoading(false)
        setIsUploadingImage(false)
        return
      } finally {
        setIsUploadingImage(false)
      }
    }

    if (avatarUrl) {
      formData.append('avatar_url', avatarUrl)
    }

    const result = await updateProfile(formData)

    if (result.success) {
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      reset(data) // Reset form to mark as not dirty
      setSelectedImage(null)
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update profile' })
    }

    setIsLoading(false)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    const isValidType = selectedFile.type.startsWith('image/')
    if (!isValidType) {
      setMessage({ type: 'error', text: 'Please select a valid image file' })
      return
    }

    const maxBytes = 5 * 1024 * 1024
    if (selectedFile.size > maxBytes) {
      setMessage({ type: 'error', text: 'Image must be 5MB or smaller' })
      return
    }

    setMessage(null)
    setSelectedImage(selectedFile)
    setPreviewImageUrl(URL.createObjectURL(selectedFile))
  }

  const isSubmitDisabled = (!isDirty && !selectedImage) || isLoading || isUploadingImage

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Profile Picture Section */}
      <div className="flex items-center space-x-6">
        <Avatar className="h-20 w-20">
          <AvatarImage src={previewImageUrl || profile?.avatar_url || undefined} />
          <AvatarFallback className="text-lg">
            {profile?.full_name ? getInitials(profile.full_name) : 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Profile Picture</h3>
          <p className="text-sm text-gray-600">Upload a new profile picture.</p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-2"
          >
            <label htmlFor="avatar-upload" className="cursor-pointer">
              <Camera className="h-4 w-4 mr-2" />
              {selectedImage ? 'Photo Selected' : 'Change Photo'}
            </label>
          </Button>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelection}
          />
          <p className="text-xs text-gray-500 mt-1">
            JPG, PNG, or WebP up to 5MB
          </p>
        </div>
      </div>

      {/* Full Name Field */}
      <div className="space-y-2">
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <Input
          id="full_name"
          {...register('full_name')}
          placeholder="Enter your full name"
          className="w-full"
        />
        {errors.full_name && (
          <p className="text-sm text-red-600">{errors.full_name.message}</p>
        )}
      </div>

      {/* Email Field (Read-only) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <Input
          value={user.email ?? ''}
          disabled
          className="w-full bg-gray-50"
        />
        <p className="text-xs text-gray-500">Email cannot be changed</p>
      </div>

      {/* Role Field (Read-only) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Role
        </label>
        <Input
          value={profile?.role?.replace('_', ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()) || 'Team Member'}
          disabled
          className="w-full bg-gray-50"
        />
        <p className="text-xs text-gray-500">Role is managed by your organization</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset()
            setSelectedImage(null)
            setPreviewImageUrl(null)
          }}
          disabled={(!isDirty && !selectedImage) || isLoading || isUploadingImage}
        >
          <X className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button
          type="submit"
          disabled={isSubmitDisabled}
        >
          <Save className="h-4 w-4 mr-2" />
          {isLoading
            ? 'Saving...'
            : isUploadingImage
              ? 'Uploading Photo...'
              : 'Save Changes'}
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="pt-6 border-t border-red-100">
        <h3 className="text-lg font-semibold text-red-700">Danger zone</h3>
        <p className="text-sm text-gray-600 mt-1">
          Deleting your account is permanent and will remove your profile and memberships. If you own an organization,
          it may also be deleted.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <label htmlFor="delete-confirm" className="block text-sm font-medium text-gray-700">
              Type <span className="font-semibold">DELETE</span> to confirm
            </label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="max-w-xs"
            />
          </div>

          <Button
            type="button"
            variant="destructive"
            disabled={isDeletingAccount || deleteConfirmText !== 'DELETE'}
            onClick={async () => {
              setIsDeletingAccount(true)
              setMessage(null)
              try {
                const resp = await fetch('/api/me/delete-account', { method: 'POST' })
                const body = await resp.json().catch(() => ({}))
                if (!resp.ok) {
                  throw new Error(body?.error || 'Failed to delete account')
                }

                // Best-effort local sign-out + redirect.
                await supabase.auth.signOut()
                window.location.href = '/'
              } catch (e) {
                setMessage({
                  type: 'error',
                  text: e instanceof Error ? e.message : 'Failed to delete account',
                })
              } finally {
                setIsDeletingAccount(false)
              }
            }}
          >
            {isDeletingAccount ? 'Deleting…' : 'Delete account'}
          </Button>
        </div>
      </div>
    </form>
  )
}