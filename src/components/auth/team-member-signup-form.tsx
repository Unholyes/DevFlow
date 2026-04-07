"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase/client"
import { Eye, EyeOff } from "lucide-react"

interface TeamMemberSignupFormProps {
  token: string
}

const teamMemberSignupSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type TeamMemberSignupFormData = z.infer<typeof teamMemberSignupSchema>

export function TeamMemberSignupForm({ token }: TeamMemberSignupFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [invitationData, setInvitationData] = useState<{
    email: string
    organizationName: string
    inviterName: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeamMemberSignupFormData>({
    resolver: zodResolver(teamMemberSignupSchema),
  })

  useEffect(() => {
    // Verify invitation token and get invitation details
    const verifyInvitation = async () => {
      if (!token) {
        setError("Invalid invitation link")
        return
      }

      try {
        // TEMPORARY: Using mock data for testing
        // In production, this would verify the token with the backend
        if (token === "test-token-123") {
          setInvitationData({
            email: "john.doe@example.com",
            organizationName: "Acme Corp",
            inviterName: "Jane Smith",
          })
        } else {
          // In a real app, you'd verify the token with your backend
          const { data, error } = await supabase
            .from('team_invitations')
            .select(`
              email,
              organization_id,
              organizations:organization_id (name),
              inviter_id,
              profiles:inviter_id (full_name)
            `)
            .eq('token', token)
            .eq('status', 'pending')
            .single()

          if (error || !data) {
            setError("Invalid or expired invitation")
            return
          }

          // Type assertion for the joined data
          const orgData = (data.organizations as { name: string }[])[0]
          const profileData = (data.profiles as { full_name: string }[])[0]

          if (!orgData || !profileData) {
            setError("Invalid invitation data")
            return
          }

          setInvitationData({
            email: data.email,
            organizationName: orgData.name,
            inviterName: profileData.full_name,
          })
        }
      } catch (err) {
        setError("Failed to verify invitation")
      }
    }

    verifyInvitation()
  }, [token])

  const onSubmit = async (data: TeamMemberSignupFormData) => {
    if (!invitationData || !token) return

    setIsLoading(true)
    setError(null)

    try {
      // TEMPORARY: Skip actual signup for test token
      if (token === "test-token-123") {
        // Simulate successful signup for testing
        setTimeout(() => {
          alert("Test signup successful! Password: " + data.password)
          setIsLoading(false)
        }, 1000)
        return
      }

      // Sign up the team member with the invited email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitationData.email,
        password: data.password,
        options: {
          data: {
            role: 'team_member',
          }
        }
      })

      if (authError) {
        setError(authError.message)
        return
      }

      // Update invitation status and link user to organization
      if (authData.user) {
        // Mark invitation as accepted
        await supabase
          .from('team_invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('token', token)

        // Add user to organization members
        await supabase
          .from('organization_members')
          .insert({
            organization_id: (await supabase
              .from('team_invitations')
              .select('organization_id')
              .eq('token', token)
              .single()).data?.organization_id,
            user_id: authData.user.id,
            role: 'member',
            joined_at: new Date().toISOString(),
          })
      }

      window.location.href = "/dashboard?message=Welcome to the team!"
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (!invitationData) {
    return (
      <div className="relative max-w-md w-[448px] min-h-[400px] bg-white rounded-2xl flex items-center justify-center">
        <div className="text-center">
          {error ? (
            <p className="text-red-600 text-lg">{error}</p>
          ) : (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-500">Loading invitation details...</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative max-w-md w-[448px] bg-white rounded-2xl p-12 flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col items-start gap-2 bg-transparent">
        <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
          <div className="relative flex items-center self-stretch mt-[-1.00px] font-bold text-slate-900 text-3xl tracking-[0] leading-9">
            Join {invitationData.organizationName}
          </div>
        </div>

        <div className="self-stretch flex flex-col items-start relative w-full flex-[0_0_auto]">
          <p className="relative flex items-center self-stretch mt-[-1.00px] font-normal text-slate-500 text-base tracking-[0] leading-6">
            {invitationData.inviterName} invited you to collaborate
          </p>
        </div>
      </header>

      {/* Invitation Info */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
            <p className="text-sm font-medium text-slate-700">Email: {invitationData.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
            <p className="text-sm font-medium text-slate-700">Organization: {invitationData.organizationName}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-col items-start gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label
              className="font-semibold text-slate-700 text-sm"
              htmlFor="password"
            >
              Create Password
            </label>

            <div className="relative flex items-center px-4 py-3.5 bg-white rounded-xl border border-slate-200">
              <input
                {...register("password")}
                className="relative grow border-[none] bg-transparent self-stretch mt-[-1.00px] font-normal text-slate-900 text-base tracking-[0] leading-[normal] p-0 placeholder:text-slate-400 focus:outline-none pr-10"
                id="password"
                placeholder="Create a strong password"
                type={showPassword ? "text" : "password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="flex flex-col items-start gap-1.5 relative self-stretch w-full flex-[0_0_auto]">
            <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
              <div className="relative flex items-center self-stretch mt-[-1.00px] font-semibold text-slate-700 text-sm tracking-[0] leading-5">
                Confirm Password
              </div>
            </div>

            <div className="flex items-start justify-center px-4 py-3.5 relative self-stretch w-full flex-[0_0_auto] bg-white rounded-xl overflow-hidden border border-solid border-slate-200">
              <input
                {...register("confirmPassword")}
                className="relative grow border-[none] bg-transparent self-stretch mt-[-1.00px] font-normal text-slate-900 text-base tracking-[0] leading-[normal] p-0 placeholder:text-slate-400 focus:outline-none"
                id="confirmPassword"
                placeholder="Confirm your password"
                type="password"
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Join Team Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 w-full rounded-xl transition-colors duration-200 relative"
          >
            <div className="absolute inset-0 bg-[#ffffff01] shadow-[0px_4px_6px_-4px_#3b82f633,0px_10px_15px_-3px_#3b82f633] rounded-xl" />
            <span className="font-semibold text-white text-base relative">
              {isLoading ? "Joining Team..." : "Join Team"}
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}