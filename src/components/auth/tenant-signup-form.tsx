"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase/client"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"

const tenantSignupSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type TenantSignupFormData = z.infer<typeof tenantSignupSchema>

export function TenantSignupForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TenantSignupFormData>({
    resolver: zodResolver(tenantSignupSchema),
  })

  const onSubmit = async (data: TenantSignupFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: 'tenant_admin',
            organization_name: data.organizationName,
          }
        }
      })

      if (authError) {
        setError(authError.message)
        return
      }

      // Create the organization in your database
      if (authData.user) {
        const { error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: data.organizationName,
            owner_id: authData.user.id,
            created_at: new Date().toISOString(),
          })

        if (orgError) {
          console.error('Error creating organization:', orgError)
          // You might want to delete the user if org creation fails
        }
      }

      window.location.href = "/auth/login?message=Check your email to verify your account and organization setup"
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
            Create Workspace
          </div>
        </div>

        <div className="self-stretch flex flex-col items-start relative w-full flex-[0_0_auto]">
          <p className="relative flex items-center self-stretch mt-[-1.00px] font-normal text-slate-500 text-base tracking-[0] leading-6">
            Set up your organization and start collaborating
          </p>
        </div>
      </header>

      {/* Form */}
      <div className="flex flex-col items-start gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-6">
          {/* Organization Name Field */}
          <div className="flex flex-col gap-1.5">
            <label
              className="font-semibold text-slate-700 text-sm"
              htmlFor="organizationName"
            >
              Organization Name
            </label>

            <div className="flex items-center px-4 py-3.5 bg-white rounded-xl border border-slate-200">
              <input
                {...register("organizationName")}
                className="relative grow border-[none] bg-transparent self-stretch mt-[-1.00px] font-normal text-slate-900 text-base tracking-[0] leading-[normal] p-0 placeholder:text-slate-400 focus:outline-none"
                id="organizationName"
                placeholder="Your Company Name"
                type="text"
              />
            </div>
            {errors.organizationName && (
              <p className="text-sm text-red-600 mt-1">{errors.organizationName.message}</p>
            )}
          </div>

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
                placeholder="admin@company.com"
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
                placeholder="Create a password"
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

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Create Organization Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 w-full rounded-xl transition-colors duration-200 relative"
          >
            <div className="absolute inset-0 bg-[#ffffff01] shadow-[0px_4px_6px_-4px_#3b82f633,0px_10px_15px_-3px_#3b82f633] rounded-xl" />
            <span className="font-semibold text-white text-base relative">
              {isLoading ? "Creating Workspace..." : "Create Workspace"}
            </span>
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <span className="font-normal text-slate-500 text-sm">
          Already have an account?
        </span>

        <Link href="/auth/login" className="font-semibold text-blue-600 text-sm hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  )
}