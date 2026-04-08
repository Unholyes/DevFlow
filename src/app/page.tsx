import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { SDLCSShowcase } from "@/components/sdlcs-showcase"
import { Testimonials } from "@/components/testimonials"
import { CTA } from "@/components/cta"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="pt-16">
      <Header />
      <Hero />
      <Features />
      <SDLCSShowcase />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  )
}
