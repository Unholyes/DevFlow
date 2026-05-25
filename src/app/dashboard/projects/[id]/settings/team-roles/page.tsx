import { redirect } from 'next/navigation'

/** Team role permissions are configured under Accounts → Team roles, not project settings. */
export default function ProjectTeamRolesSettingsPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/projects/${params.id}`)
}
