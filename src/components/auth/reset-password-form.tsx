"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase/client"

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

function mapError(error: string | null) {
  if (!error) return null
  if (error === "otp_verify_failed") return "The reset link is invalid or has expired. Please request a new one."
  if (error === "missing_code") return "The reset link is incomplete. Please request a new one."
  return "Unable to verify reset link. Please request a new one."
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(mapError(searchParams.get("error")))
  const [success, setSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      setSuccess("Password updated successfully. You can now sign in.")
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative max-w-md w-[448px] bg-white rounded-2xl p-12 flex flex-col gap-8">
      <header className="flex flex-col items-start gap-2 bg-transparent">
        <div className="relative flex items-center self-stretch font-bold text-slate-900 text-3xl tracking-[0] leading-9">
          Reset Password
        </div>
        <p className="relative flex items-center self-stretch font-normal text-slate-500 text-base tracking-[0] leading-6">
          Enter your new password below.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-slate-700 text-sm" htmlFor="password">
            New Password
          </label>
          <div className="flex items-center px-4 py-3.5 bg-white rounded-xl border border-slate-200">
            <input
              {...register("password")}
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Enter new password"
              className="relative grow border-[none] bg-transparent font-normal text-slate-900 text-base tracking-[0] leading-[normal] p-0 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-slate-700 text-sm" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <div className="flex items-center px-4 py-3.5 bg-white rounded-xl border border-slate-200">
            <input
              {...register("confirmPassword")}
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Confirm new password"
              className="relative grow border-[none] bg-transparent font-normal text-slate-900 text-base tracking-[0] leading-[normal] p-0 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          {errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{errors.confirmPassword.message}</p>}
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
        {success && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{success}</div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 w-full rounded-xl transition-colors duration-200"
        >
          <span className="font-semibold text-white text-base">
            {isLoading ? "Updating..." : "Update Password"}
          </span>
        </button>
      </form>

      <div className="flex items-center justify-center mt-2">
        <Link href="/auth/login" className="font-semibold text-blue-600 text-sm hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}
