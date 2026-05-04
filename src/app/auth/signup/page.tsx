import { TenantSignupForm } from "@/components/auth/tenant-signup-form"
import { SignupFeatureCarousel } from "@/components/auth/signup-feature-carousel"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function SignupPage() {
  return (
    <div className="flex min-h-screen relative bg-white">
      {/* Left side - Marketing content */}
      <div className="flex flex-col flex-1 items-center justify-center p-24 relative bg-[#f0f4fa]">
        <Link
          href="/"
          className="absolute left-8 top-8 inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-white/90 transition-colors border border-slate-200/60 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to landing page
        </Link>

        <div className="max-w-2xl gap-12 flex flex-col items-start relative w-full flex-[0_0_auto]">
          <div className="flex-col items-start gap-4 self-stretch w-full flex-[0_0_auto] flex relative">
            <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
              <div className="relative self-stretch mt-[-1.00px] font-bold text-slate-900 text-5xl tracking-[-1.20px] leading-[48px]">
                Build Better Teams
                <br />
                Together
              </div>
            </div>

            <div className="self-stretch flex flex-col items-start relative w-full flex-[0_0_auto]">
              <p className="relative self-stretch mt-[-1.00px] font-medium text-slate-500 text-lg tracking-[0] leading-7">
                Create your workspace and invite your team to collaborate efficiently on projects
              </p>
            </div>
          </div>

          <SignupFeatureCarousel />
        </div>
      </div>

      {/* Right side - Signup form */}
      <div className="flex flex-1 items-center justify-center p-6 relative bg-white">
        <TenantSignupForm />
      </div>
    </div>
  )
}