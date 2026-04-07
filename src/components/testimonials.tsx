import { Card, CardContent } from "@/components/ui/card"

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Tech Lead",
    company: "InnovateLabs",
    content: "DevFlow transformed our development process. The multi-methodology support allows us to adapt to different project needs seamlessly.",
    avatar: "SC"
  },
  {
    name: "Marcus Johnson",
    role: "Product Manager",
    company: "TechCorp",
    content: "The burndown charts and real-time collaboration features have improved our sprint planning by 40%. Highly recommended!",
    avatar: "MJ"
  },
  {
    name: "Elena Rodriguez",
    role: "Engineering Manager",
    company: "DevStudio",
    content: "Multi-tenant architecture gives us the security we need. Our team's productivity has increased significantly since switching to DevFlow.",
    avatar: "ER"
  },
  {
    name: "David Kim",
    role: "Scrum Master",
    company: "AgileWorks",
    content: "The flexible SDLC configurations perfectly match our hybrid approach. DevFlow adapts to our workflow, not the other way around.",
    avatar: "DK"
  },
]

export function Testimonials() {
  return (
    <section className="py-24 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Loved by development teams worldwide
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            See what teams are saying about DevFlow and how it&apos;s transforming their development workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {testimonials.map((testimonial, idx) => (
            <Card key={idx} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                      &ldquo;{testimonial.content}&rdquo;
                    </p>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {testimonial.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {testimonial.role} at {testimonial.company}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}