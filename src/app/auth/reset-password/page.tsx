import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { Suspense } from "react"

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-[#f8fafc]">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
