"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase/client"
import { Eye, EyeOff, Shield } from "lucide-react"
import Link from "next/link"

const superAdminSignupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  secretKey: z.string().min(1, "Secret key is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SuperAdminSignupFormData = z.infer<typeof superAdminSignupSchema>

export function SuperAdminSignupForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SuperAdminSignupFormData>({
    resolver: zodResolver(superAdminSignupSchema),
  })

  const onSubmit = async (data: SuperAdminSignupFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Verify secret key (in production, this should be an environment variable)
      const validSecretKey = process.env.NEXT_PUBLIC_SUPER_ADMIN_SECRET_KEY || "devflow-super-admin-2024"
      
      if (data.secretKey !== validSecretKey) {
        setError("Invalid secret key")
        setIsLoading(false)
        return
      }

      // Check if super admin already exists
      const { data: existingAdmin, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'super_admin')
        .limit(1)

      if (checkError) {
        setError("Error checking for existing super admin")
        setIsLoading(false)
        return
      }

      if (existingAdmin && existingAdmin.length > 0) {
        setError("A super admin already exists. Contact the platform owner.")
        setIsLoading(false)
        return
      }

      // Sign up the super admin
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: 'super_admin',
          }
        }
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (authData.user) {
        // The profile will be created automatically by the database trigger
        window.location.href = "/auth/login?message=Super admin account created. Please sign in."
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative max-w-md w-[448px] bg-white rounded-2xl p-12 flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col items-start gap-2 bg-transparent">
        <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
          <div className="relative flex items-center self-stretch mt-[-1.00px] font-bold text-slate-900 text-3xl tracking-[0] leading-9">
            Create Super Admin
          </div>
        </div>

        <div className="self-stretch flex flex-col items-start relative w-full flex-[0_0_auto]">
          <p className="relative flex items-center self-stretch mt-[-1.00px] font-normal text-slate-500 text-base tracking-[0] leading-6">
            Set up the platform administrator account
          </p>
        </div>
      </header>

      {/* Form */}
      <div className="flex flex-col items-start gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-6">
          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <label
              className="font-semibold text-slate-700 text-sm"
              htmlFor="email"
            >
              Email
            </label>

            <div className="flex items-center px-4 py-3.5 bg-white rounded-xl border border-slate-200">
              <input
                {...register("email")}
                className="relative grow border-[none] bg-transparent self-stretch mt-[-1.00px] font-normal text-slate-900 text-base tracking-[0] leading-[normal] p-0 placeholder:text-slate-400 focus:outline-none"
                id="email"
                placeholder="admin@devflow.app"
                type="email"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-slate-700 text-sm">
              Password
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
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-slate-700 text-sm">
              Confirm Password
            </label>

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
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Secret Key Field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Secret Key
            </label>

            <div className="flex items-center px-4 py-3.5 bg-white rounded-xl border border-slate-200">
              <input
                {...register("secretKey")}
                className="relative grow border-[none] bg-transparent self-stretch mt-[-1.00px] font-normal text-slate-900 text-base tracking-[0] leading-[normal] p-0 placeholder:text-slate-400 focus:outline-none"
                id="secretKey"
                placeholder="Enter super admin secret key"
                type="password"
              />
            </div>
            {errors.secretKey && (
              <p className="text-sm text-red-600 mt-1">{errors.secretKey.message}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Contact the platform owner for the secret key
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Create Super Admin Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center py-3.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 w-full rounded-xl transition-colors duration-200 relative"
          >
            <div className="absolute inset-0 bg-[#ffffff01] shadow-[0px_4px_6px_-4px_#9333ea33,0px_10px_15px_-3px_#9333ea33] rounded-xl" />
            <span className="font-semibold text-white text-base relative">
              {isLoading ? "Creating Account..." : "Create Super Admin"}
            </span>
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <span className="font-normal text-slate-500 text-sm">
          Already have an account?
        </span>

        <Link href="/auth/login" className="font-semibold text-purple-600 text-sm hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  )
}
