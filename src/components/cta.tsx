import { Button } from "@/components/ui/button"

export function CTA() {
  return (
    <section className="py-24 bg-slate-200 dark:bg-slate-300">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-900 mb-4">
          Ready to transform your development workflow?
        </h2>
        <p className="text-xl text-slate-700 dark:text-slate-700 mb-12 max-w-2xl mx-auto leading-relaxed">
          Join thousands of development teams already using DevFlow to streamline their projects and deliver better software faster.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button size="lg" className="text-lg px-8 py-4 h-auto">
            Start Free Trial
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-8 py-4 h-auto">
            Schedule Demo
          </Button>
        </div>
        <p className="text-slate-500 dark:text-slate-500 text-sm">
          No credit card required • 14-day free trial • Cancel anytime
        </p>
      </div>
    </section>
  )
}