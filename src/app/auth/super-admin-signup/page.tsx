import { SuperAdminSignupForm } from "@/components/auth/super-admin-signup-form"

export default function SuperAdminSignupPage() {
  return (
    <div className="flex min-h-screen relative bg-white">
      {/* Left side - Marketing content */}
      <div className="flex flex-col flex-1 items-center justify-center p-24 relative bg-[#f0f4fa]">
        <div className="max-w-2xl gap-12 flex flex-col items-start relative w-full flex-[0_0_auto]">
          <div className="flex-col items-start gap-4 self-stretch w-full flex-[0_0_auto] flex relative">
            <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
              <div className="relative self-stretch mt-[-1.00px] font-bold text-slate-900 text-5xl tracking-[-1.20px] leading-[48px]">
                Super Admin Setup
              </div>
            </div>

            <div className="self-stretch flex flex-col items-start relative w-full flex-[0_0_auto]">
              <p className="relative self-stretch mt-[-1.00px] font-medium text-slate-500 text-lg tracking-[0] leading-7">
                Create the platform administrator account to manage
                <br />
                all tenant organizations and monitor platform statistics
              </p>
            </div>
          </div>

          <div className="relative self-stretch w-full rounded-lg shadow-[0px_20px_13px_#00000008,0px_8px_5px_#00000014] aspect-[1.69] bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <div className="w-24 h-24 mx-auto mb-4 bg-slate-200 rounded-lg flex items-center justify-center">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <p className="text-sm">Platform Administration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Signup form */}
      <div className="flex flex-1 items-center justify-center p-6 relative bg-white">
        <SuperAdminSignupForm />
      </div>
    </div>
  )
}
