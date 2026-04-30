"use client"

import { useState, useEffect, useRef } from "react"
import { KanbanSquare, Cog, Layers, Target } from "lucide-react"

const sdlcItems = [
  {
    name: "Kanban",
    description: "Visual workflow management with continuous delivery",
    icon: KanbanSquare,
    image: "/images/sdlc-kanban.svg"
  },
  {
    name: "DevOps",
    description: "Culture and practices for seamless development",
    icon: Cog,
    image: "/images/sdlc-devops.svg"
  },
  {
    name: "Waterfall",
    description: "Sequential development with defined phases",
    icon: Layers,
    image: "/images/sdlc-waterfall.svg"
  },
  {
    name: "Scrum",
    description: "Agile framework that emphasizes incremental delivery.",
    icon: Target,
    image: "/images/sdlc-scrum.svg"
  }
]

export function SDLCSShowcase() {
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startAnimation = (index: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    setActiveIndex(index)
    setProgress(0)

    let currentProgress = 0
    intervalRef.current = setInterval(() => {
      currentProgress = Math.min(100, currentProgress + 2)
      setProgress(currentProgress)

      if (currentProgress >= 100) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        // Animation completed, move to next item
        const nextIndex = (index + 1) % sdlcItems.length
        setTimeout(() => {
          startAnimation(nextIndex)
        }, 250) // brief pause before next bar
      }
    }, 40)
  }

  const handleItemClick = (index: number) => {
    startAnimation(index)
  }

  useEffect(() => {
    // Start automatic animation on mount
    startAnimation(0)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            SDLCS Showcase
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Explore different software development lifecycle methodologies supported by DevFlow
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16 max-w-6xl mx-auto">
          {sdlcItems.map((item, index) => (
            <div
              key={index}
              className="text-center flex flex-col items-center min-h-[200px] cursor-pointer"
              onClick={() => handleItemClick(index)}
            >
              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg transition-shadow duration-200">
                <item.icon size={32} />
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {item.name}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {item.description}
                </p>

                {/* Loading Bar */}
                <div className="w-full h-0.5 overflow-hidden rounded-lg bg-neutral-300/50 mt-4">
                  <div
                    className={[
                      "h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg",
                      // Only animate width for the active item; inactive bars should snap to 0
                      activeIndex === index ? "transition-[width] duration-75 linear" : "transition-none"
                    ].join(" ")}
                    style={{
                      width: activeIndex === index ? `${progress}%` : '0%'
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Placeholder */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                  <p className="text-gray-600 font-medium">{sdlcItems[activeIndex].name} Visualization</p>
                  <p className="text-sm text-gray-500 mt-1">Interactive dashboard coming soon</p>
          </div>
        </div>
      </div>
    </section>
  )
}