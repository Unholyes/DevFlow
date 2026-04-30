import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SetupProjectWizard } from '@/components/onboarding/setup-wizard'

export default async function NewProjectPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  return (
    <SetupProjectWizard
      title="Create Project"
      description="Set up your project, define phases, and configure one or more processes with execution methods per phase."
      submitEndpoint="/api/projects/bootstrap"
      submitLabel="Create project"
    />
  )
}
