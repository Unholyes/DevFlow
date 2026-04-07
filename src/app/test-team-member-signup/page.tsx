import { TeamMemberSignupForm } from "@/components/auth/team-member-signup-form"

export default function TestTeamMemberSignupPage() {
  // Mock token - in a real scenario this would come from the URL params
  const mockToken = "test-token-123"

  return (
    <div className="flex min-h-screen relative bg-white">
      {/* Left side - Marketing content */}
      <div className="flex flex-col flex-1 items-center justify-center p-24 relative bg-[#f0f4fa]">
        <div className="max-w-2xl gap-12 flex flex-col items-start relative w-full flex-[0_0_auto]">
          <div className="flex-col items-start gap-4 self-stretch w-full flex-[0_0_auto] flex relative">
            <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
              <div className="relative self-stretch mt-[-1.00px] font-bold text-slate-900 text-5xl tracking-[-1.20px] leading-[48px]">
                Team Member Signup Test
              </div>
            </div>

            <div className="self-stretch flex flex-col items-start relative w-full flex-[0_0_auto]">
              <p className="relative self-stretch mt-[-1.00px] font-medium text-slate-500 text-lg tracking-[0] leading-7">
                Testing the team member signup form component
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex flex-1 items-center justify-center p-6 relative bg-white">
        <TeamMemberSignupForm token={mockToken} />
      </div>
    </div>
  )
}