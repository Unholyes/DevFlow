import { Header } from "@/components/Landing_Page/header"
import { Hero } from "@/components/Landing_Page/hero"
import { Features } from "@/components/Landing_Page/features"
import { SDLCSShowcase } from "@/components/Landing_Page/sdlcs-showcase"
import { Testimonials } from "@/components/Landing_Page/testimonials"
import { CTA } from "@/components/Landing_Page/cta"
import { Footer } from "@/components/Landing_Page/footer"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

export default function Home() {
  return (
    <div className="pt-16">
      <Header />
      <ScrollReveal>
        <Hero />
      </ScrollReveal>
      <ScrollReveal delayMs={50}>
        <Features />
      </ScrollReveal>
      <ScrollReveal delayMs={75}>
        <SDLCSShowcase />
      </ScrollReveal>
      <ScrollReveal delayMs={100}>
        <Testimonials />
      </ScrollReveal>
      <ScrollReveal delayMs={125}>
        <CTA />
      </ScrollReveal>
      <ScrollReveal delayMs={150}>
        <Footer />
      </ScrollReveal>
    </div>
  )
}
