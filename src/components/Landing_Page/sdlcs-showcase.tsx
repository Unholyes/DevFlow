"use client"

import { useState, useEffect, useRef } from "react"
import { KanbanSquare, Cog, Layers, Target } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

const sdlcItems = [
  {
    name: "Kanban",
    description: "Visual workflow management with continuous delivery",
    icon: KanbanSquare,
    image: "/images/kanban.jpg",
  },
  {
    name: "DevOps",
    description: "Culture and practices for seamless development",
    icon: Cog,
    image: "/images/devops.jpg",
  },
  {
    name: "Waterfall",
    description: "Sequential development with defined phases",
    icon: Layers,
    image: "/images/waterfall.jpg",
  },
  {
    name: "Scrum",
    description: "Agile framework that emphasizes incremental delivery.",
    icon: Target,
    image: "/images/sprint.jpg",
  },
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
        const nextIndex = (index + 1) % sdlcItems.length
        setTimeout(() => {
          startAnimation(nextIndex)
        }, 250)
      }
    }, 40)
  }

  const handleItemClick = (index: number) => {
    startAnimation(index)
  }

  const goNext = () => startAnimation((activeIndex + 1) % sdlcItems.length)
  const goPrev = () => startAnimation((activeIndex - 1 + sdlcItems.length) % sdlcItems.length)

  useEffect(() => {
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
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            SDLCS Showcase
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Explore different software development lifecycle methodologies supported by DevFlow
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16 max-w-6xl mx-auto">
          {sdlcItems.map((item, index) => (
            <div
              key={index}
              className="text-center flex flex-col items-center min-h-[200px] cursor-pointer"
              onClick={() => handleItemClick(index)}
            >
              <div
                className={[
                  "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-white shadow-lg transition-shadow duration-200",
                  activeIndex === index
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 scale-105"
                    : "bg-gradient-to-br from-blue-400 to-blue-600 opacity-70",
                ].join(" ")}
              >
                <item.icon size={32} />
              </div>
              <div className="flex-1 flex flex-col justify-center w-full">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.name}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                <div className="w-full h-0.5 overflow-hidden rounded-lg bg-neutral-300/50 mt-4">
                  <div
                    className={[
                      "h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg",
                      activeIndex === index ? "transition-[width] duration-75 linear" : "transition-none",
                    ].join(" ")}
                    style={{ width: activeIndex === index ? `${progress}%` : "0%" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
            <div className="relative w-full min-h-[280px] sm:min-h-[360px] md:min-h-[480px] lg:min-h-[540px]">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={activeIndex}
                  className="absolute inset-0 flex items-center justify-center bg-slate-50 p-3 sm:p-4 md:p-6"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
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
                  <img
                    src={sdlcItems[activeIndex].image}
                    alt={sdlcItems[activeIndex].name}
                    className="h-full w-full max-h-[min(72vh,720px)] object-contain"
                    draggable={false}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
