import { TeamMemberSignupForm } from "@/components/auth/team-member-signup-form"

interface InvitePageProps {
  params: {
    token: string
  }
}

export default function InvitePage({ params }: InvitePageProps) {
  return (
    <div className="flex min-h-screen relative bg-white">
      {/* Left side - Marketing content */}
      <div className="flex flex-col flex-1 items-center justify-center p-24 relative bg-[#f0f4fa]">
        <div className="max-w-2xl gap-12 flex flex-col items-start relative w-full flex-[0_0_auto]">
          <div className="flex-col items-start gap-4 self-stretch w-full flex-[0_0_auto] flex relative">
            <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
              <div className="relative self-stretch mt-[-1.00px] font-bold text-slate-900 text-5xl tracking-[-1.20px] leading-[48px]">
                Join the Team
                <br />
                Welcome Aboard
              </div>
            </div>

            <div className="self-stretch flex flex-col items-start relative w-full flex-[0_0_auto]">
              <p className="relative self-stretch mt-[-1.00px] font-medium text-slate-500 text-lg tracking-[0] leading-7">
                Your team is waiting for you. Complete your account setup
                <br />
                and start collaborating on projects together.
              </p>
            </div>
          </div>

          <div className="relative self-stretch w-full rounded-lg shadow-[0px_20px_13px_#00000008,0px_8px_5px_#00000014] aspect-[1.69] bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <div className="w-24 h-24 mx-auto mb-4 bg-slate-200 rounded-lg flex items-center justify-center">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L19 6.6C18.8 6 18.5 5.4 18.1 4.9L19 3L17 1L15.4 1.9C14.9 1.5 14.3 1.2 13.7 1L13 0H11L10.3 1C9.7 1.2 9.1 1.5 8.6 1.9L7 1L5 3L5.9 4.9C5.5 5.4 5.2 6 5 6.6L3 7V9L5 9.4C5.2 10 5.5 10.6 5.9 11.1L5 13L7 15L8.6 14.1C9.1 14.5 9.7 14.8 10.3 15L11 16H13L13.7 15C14.3 14.8 14.9 14.5 15.4 14.1L17 15L19 13L18.1 11.1C18.5 10.6 18.8 10 19 9.4L21 9ZM16.5 10C15.67 10 15 9.33 15 8.5C15 7.67 15.67 7 16.5 7C17.33 7 18 7.67 18 8.5C18 9.33 17.33 10 16.5 10Z"/>
                </svg>
              </div>
              <p className="text-sm">Team Invitation Preview</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Invitation form */}
      <div className="flex flex-1 items-center justify-center p-6 relative bg-white">
        <TeamMemberSignupForm token={params.token} />
      </div>
    </div>
  )
}