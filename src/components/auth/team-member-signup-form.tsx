"use client"

import { useState, useEffect, useCallback } from "react"
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

function normalizeEmail(email: string | null | undefined) {
  return String(email ?? "").trim().toLowerCase()
}

async function hydrateSessionFromHash() {
  if (typeof window === "undefined") return

  const hash = window.location.hash?.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash
  if (!hash) return

  const params = new URLSearchParams(hash)
  const access_token = params.get("access_token")
  const refresh_token = params.get("refresh_token")

  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token })
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
  }
}

export function TeamMemberSignupForm({ token }: TeamMemberSignupFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [invitationData, setInvitationData] = useState<{
    email: string
    organizationName: string
    inviterName: string
  } | null>(null)
  const [hasSession, setHasSession] = useState(false)
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeamMemberSignupFormData>({
    resolver: zodResolver(teamMemberSignupSchema),
  })

  useEffect(() => {
    const verifyInvitation = async () => {
      if (!token) {
        setError("Invalid invitation link")
        return
      }

      try {
        const res = await fetch(`/api/invite/${encodeURIComponent(token)}`, { method: "GET" })
        const payload = await res.json().catch(() => null)
        if (!res.ok) {
          setError(payload?.error ?? "Invalid or expired invitation")
          return
        }

        setInvitationData({
          email: payload.email,
          organizationName: payload.organizationName,
          inviterName: payload.inviterName,
        })
      } catch {
        setError("Failed to verify invitation")
      }
    }

    void verifyInvitation()
  }, [token])

  const syncSessionForInvite = useCallback(async (invitedEmail: string) => {
    await hydrateSessionFromHash()

    const { data } = await supabase.auth.getSession()
    const session = data.session
    const inviteEmail = normalizeEmail(invitedEmail)
    const sessionEmail = normalizeEmail(session?.user?.email)

    if (session && sessionEmail && sessionEmail !== inviteEmail) {
      await supabase.auth.signOut()
      setHasSession(false)
      setSessionNotice(
        `You're signed in as ${session.user.email}. Open the invite link from the email sent to ${invitedEmail}.`
      )
      return
    }

    setSessionNotice(null)
    setHasSession(Boolean(session) && sessionEmail === inviteEmail)
  }, [])

  useEffect(() => {
    if (!invitationData?.email) return

    void syncSessionForInvite(invitationData.email)

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void syncSessionForInvite(invitationData.email)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [invitationData, syncSessionForInvite])

  const onSubmit = async (data: TeamMemberSignupFormData) => {
    if (!invitationData || !token) return

    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError("Please open the invite link from your email again to verify and start account setup.")
        return
      }

      const inviteEmail = normalizeEmail(invitationData.email)
      const sessionEmail = normalizeEmail(user.email)
      if (sessionEmail !== inviteEmail) {
        await supabase.auth.signOut()
        setHasSession(false)
        setError(
          `This invitation is for ${invitationData.email}. You are signed in as ${user.email ?? "another account"}. Use the invite link from the correct email.`
        )
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: data.password })
      if (updateError) {
        setError(updateError.message)
        return
      }

      const res = await fetch(`/api/invite/${encodeURIComponent(token)}`, { method: "POST" })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.error ?? "Failed to accept invitation")
        return
      }

      window.location.href = "/dashboard?message=Welcome to the team!"
    } catch {
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

      <div className="flex flex-col items-start gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
          {!hasSession && (sessionNotice || !error) && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              {sessionNotice ??
                "Open this page using the invite link from your email so we can verify you. If you were signed in as someone else, sign out and use the link again."}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-slate-700 text-sm" htmlFor="password">
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
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col items-start gap-1.5 relative self-stretch w-full flex-[0_0_auto]">
            <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
              <div className="relative flex items-center self-stretch mt-[-1.00px] font-semibold text-slate-700 text-sm tracking-[0] leading-5">
                Confirm Password
              </div>
            </div>

            <div className="relative flex items-center px-4 py-3.5 bg-white rounded-xl border border-slate-200">
              <input
                {...register("confirmPassword")}
                className="relative grow border-[none] bg-transparent self-stretch mt-[-1.00px] font-normal text-slate-900 text-base tracking-[0] leading-[normal] p-0 placeholder:text-slate-400 focus:outline-none pr-10"
                id="confirmPassword"
                placeholder="Confirm your password"
                type={showConfirmPassword ? "text" : "password"}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowConfirmPassword(!showConfirmPassword)
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200 z-10 bg-transparent border-none cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !hasSession}
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
