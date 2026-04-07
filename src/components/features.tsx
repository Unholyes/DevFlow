import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Workflow,
  BarChart3,
  Shield,
  CheckCircle,
  Calendar
} from "lucide-react"

const features = [
  {
    name: "Multi-Tenant Architecture",
    description: "Secure, isolated workspaces for different organizations with complete data separation.",
    Icon: Shield,
  },
  {
    name: "SDLC Methodologies",
    description: "Support for Scrum, Kanban, Waterfall, and DevOps with configurable workflows.",
    Icon: Workflow,
  },
  {
    name: "Team Collaboration",
    description: "Real-time collaboration tools for distributed development teams.",
    Icon: Users,
  },
  {
    name: "Project Tracking",
    description: "Comprehensive dashboards with burndown charts, progress tracking, and analytics.",
    Icon: BarChart3,
  },
  {
    name: "Task Management",
    description: "Advanced task management with priorities, dependencies, and automated workflows.",
    Icon: CheckCircle,
  },
  {
    name: "Calendar Integration",
    description: "Integrated calendar with sprint planning, deadlines, and milestone tracking.",
    Icon: Calendar,
  },
]

export function Features() {
  return (
    <section className="py-24 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything you need to manage development projects
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            DevFlow provides comprehensive tools for modern development teams to plan, track, and deliver projects efficiently.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, idx) => (
            <Card key={idx} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                  <feature.Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                  {feature.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}