import { Card, CardContent } from "@/components/ui/card"
import { Marquee } from "@/components/ui/marquee"
import { cn } from "@/lib/utils"

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

function TestimonialCard({
  testimonial,
  className,
}: {
  testimonial: (typeof testimonials)[number]
  className?: string
}) {
  return (
    <Card
      className={cn(
        "w-[320px] border-0 shadow-sm hover:shadow-md transition-shadow duration-200",
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {testimonial.avatar}
          </div>
          <div className="flex-1">
            <p className="text-slate-700 dark:text-slate-700 mb-4 leading-relaxed">
              &ldquo;{testimonial.content}&rdquo;
            </p>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-900">
                {testimonial.name}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-600">
                {testimonial.role} at {testimonial.company}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function Testimonials() {
  const firstRow = testimonials.slice(0, Math.ceil(testimonials.length / 2))
  const secondRow = testimonials.slice(Math.ceil(testimonials.length / 2))

  return (
    <section className="py-24 bg-white dark:bg-slate-50" style={{paddingTop: '96px', paddingBottom: '96px'}}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-900 mb-4">
            Loved by development teams worldwide
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-600 max-w-2xl mx-auto">
            See what teams are saying about DevFlow and how it&apos;s transforming their development workflows.
          </p>
        </div>

        <div className="relative mx-auto max-w-6xl overflow-hidden">
          <Marquee pauseOnHover className="[--duration:22s] [--gap:1.25rem] py-2">
            {firstRow.map((t) => (
              <TestimonialCard key={`${t.name}-${t.company}`} testimonial={t} />
            ))}
          </Marquee>

          <Marquee
            reverse
            pauseOnHover
            className="[--duration:22s] [--gap:1.25rem] py-2"
          >
            {secondRow.map((t) => (
              <TestimonialCard key={`${t.name}-${t.company}`} testimonial={t} />
            ))}
          </Marquee>

          {/* Edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent dark:from-slate-50" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent dark:from-slate-50" />
        </div>
      </div>
    </section>
  )
}