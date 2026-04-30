"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase/client"

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo,
      })

      if (resetError) {
        setError(resetError.message)
        return
      }

      setSuccess("If that email exists, we sent a password reset link.")
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
          Forgot Password
        </div>
        <p className="relative flex items-center self-stretch font-normal text-slate-500 text-base tracking-[0] leading-6">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-slate-700 text-sm" htmlFor="email">
            Email
          </label>
          <div className="flex items-center px-4 py-3.5 bg-white rounded-xl border border-slate-200">
            <input
              {...register("email")}
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              className="relative grow border-[none] bg-transparent font-normal text-slate-900 text-base tracking-[0] leading-[normal] p-0 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
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
            {isLoading ? "Sending..." : "Send Reset Link"}
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
