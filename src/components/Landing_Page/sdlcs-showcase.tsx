"use client"

import { useState, useEffect, useRef } from "react"
import { KanbanSquare, Cog, Layers, Target } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

const sdlcItems = [
  {
    name: "Kanban",
    description: "Visual workflow management with continuous delivery",
    icon: KanbanSquare,
    // Temporary PNG placeholder (swap to your own local PNG later)
    image: "https://picsum.photos/seed/devflow-kanban/800/600?grayscale"
  },
  {
    name: "DevOps",
    description: "Culture and practices for seamless development",
    icon: Cog,
    image: "https://picsum.photos/seed/devflow-devops/800/600?grayscale"
  },
  {
    name: "Waterfall",
    description: "Sequential development with defined phases",
    icon: Layers,
    image: "https://picsum.photos/seed/devflow-waterfall/800/600?grayscale"
  },
  {
    name: "Scrum",
    description: "Agile framework that emphasizes incremental delivery.",
    icon: Target,
    image: "https://picsum.photos/seed/devflow-scrum/800/600?grayscale"
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

  const goNext = () => startAnimation((activeIndex + 1) % sdlcItems.length)
  const goPrev = () => startAnimation((activeIndex - 1 + sdlcItems.length) % sdlcItems.length)

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
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 md:p-6 border border-slate-200 shadow-sm">
            <div className="flex items-baseline justify-between gap-4 px-2 pb-3">
              <p className="text-xs text-gray-500">Drag left/right to switch</p>
            </div>

            <div className="relative w-full overflow-hidden rounded-xl bg-white/50 border border-slate-200">
              <div className="relative h-[420px] md:h-[460px]">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.div
                    key={activeIndex}
                    className="absolute inset-0 flex items-center justify-center p-4 md:p-6"
                    initial={{ opacity: 0, x: 40, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -40, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.12}
                    onDragEnd={(_, info) => {
                      const swipe = info.offset.x + info.velocity.x * 0.2
                      if (swipe < -80) goNext()
                      else if (swipe > 80) goPrev()
                    }}
                  >
                    <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <div className="relative order-2 md:order-1">
                        <div className="text-sm text-slate-500 font-medium mb-2">Methodology</div>
                        <div className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                          {sdlcItems[activeIndex].name}
                        </div>
                        <p className="text-slate-600 mt-3 leading-relaxed">
                          {sdlcItems[activeIndex].description}
                        </p>
                      </div>

                      <div className="order-1 md:order-2">
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100">
                          <img
                            src={sdlcItems[activeIndex].image}
                            alt={sdlcItems[activeIndex].name}
                            className="h-full w-full object-cover"
                            draggable={false}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}