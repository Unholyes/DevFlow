import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export function Header() {
  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-gray-900">DevFlow</h1>
        </div>
        <nav className="hidden md:flex space-x-8">
          <a href="#home" className="text-gray-700 hover:text-gray-900">Home</a>
          <a href="#features" className="text-gray-700 hover:text-gray-900">Features</a>
          <a href="#pricing" className="text-gray-700 hover:text-gray-900">Pricing</a>
          <a href="#contact" className="text-gray-700 hover:text-gray-900">Contact</a>
        </nav>
        <div className="flex items-center space-x-4">
          <Button variant="outline">Sign In</Button>
          <Button>Get Started</Button>
          <Menu className="md:hidden h-6 w-6" />
        </div>
      </div>
    </header>
  )
}