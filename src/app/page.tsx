import { Header } from "@/components/Landing_Page/header"
import { Hero } from "@/components/Landing_Page/hero"
import { Features } from "@/components/Landing_Page/features"
import { SDLCSShowcase } from "@/components/Landing_Page/sdlcs-showcase"
import { Testimonials } from "@/components/Landing_Page/testimonials"
import { CTA } from "@/components/Landing_Page/cta"
import { Footer } from "@/components/Landing_Page/footer"

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
