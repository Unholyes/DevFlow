import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-white dark:bg-slate-50">
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-200 text-sm font-medium text-slate-700 dark:text-slate-600 mb-8">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Now in beta
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-slate-900 mb-6 leading-tight">
            Streamline Your Development Workflows
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            DevFlow is a multi-tenant SaaS platform that empowers development teams with structured project management
            across Scrum, Kanban, Waterfall, and DevOps methodologies.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="text-lg px-8 py-4 h-auto">
              Start Free Trial
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4 h-auto">
              Watch Demo
            </Button>
          </div>

          <div className="text-sm text-slate-500 dark:text-slate-500">
            Trusted by 1000+ development teams worldwide
          </div>
        </div>
      </div>
    </section>
  )
}