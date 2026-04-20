import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import Link from "next/link"

export function Header() {
  return (
    <header className="fixed top-0 w-full bg-white border-b border-slate-200 px-6 py-4 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/" className="text-2xl font-bold text-slate-900">
            DevFlow
          </Link>
        </div>
        <nav className="hidden md:flex space-x-8">
          <a href="#home" className="text-slate-700 hover:text-slate-900">Home</a>
          <a href="#features" className="text-slate-700 hover:text-slate-900">Features</a>
          <a href="#pricing" className="text-slate-700 hover:text-slate-900">Pricing</a>
          <a href="#contact" className="text-slate-700 hover:text-slate-900">Contact</a>
        </nav>
        <div className="flex items-center space-x-4">
          <Link href="/auth/login">
            <Button variant="link">Sign In</Button>
          </Link>
          <Link href="/auth/signup">
            <Button>Get Started</Button>
          </Link>
          <Menu className="md:hidden h-6 w-6" />
        </div>
      </div>
    </header>
  )
}