"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type FeatureItem = {
  key: "accounts" | "projects" | "reports"
  name: string
  imageSrc: string
}

const ROTATE_MS = 3500
const TICK_MS = 40

export function SignupFeatureCarousel() {
  const items = useMemo<FeatureItem[]>(
    () => [
      { key: "accounts", name: "Accounts", imageSrc: "/images/signup-accounts.svg" },
      { key: "projects", name: "Projects", imageSrc: "/images/signup-projects.svg" },
      { key: "reports", name: "Reports & Analytics", imageSrc: "/images/signup-reports.svg" },
    ],
    [],
  )

  const [activeIndex, setActiveIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<number | null>(null)

  const stop = () => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    stop()

    let currentIndex = 0
    let currentProgress = 0
    const step = (100 * TICK_MS) / ROTATE_MS

    setActiveIndex(currentIndex)
    setProgress(currentProgress)

    intervalRef.current = window.setInterval(() => {
      setActiveIndex(currentIndex)
      setProgress(currentProgress)

      currentProgress += step
      if (currentProgress >= 100) {
        currentProgress = 0
        currentIndex = (currentIndex + 1) % items.length
      }
    }, TICK_MS)

    return stop
  }, [items.length])

  const active = items[activeIndex]

  return (
    <div className="w-full self-stretch">
      <div className="relative w-full rounded-lg shadow-[0px_20px_13px_#00000008,0px_8px_5px_#00000014] aspect-[1.69] bg-gradient-to-br from-green-50 to-green-100 overflow-hidden">
        <div className="absolute inset-0">
          {items.map((item, idx) => (
            <img
              key={item.key}
              src={item.imageSrc}
              alt={`${item.name} preview`}
              className={[
                "absolute inset-0 h-full w-full object-cover",
                "transition-opacity duration-500 ease-out will-change-opacity",
                idx === activeIndex ? "opacity-100" : "opacity-0",
              ].join(" ")}
              draggable={false}
            />
          ))}
        </div>
      </div>

      <div className="w-full h-0.5 overflow-hidden rounded-lg bg-neutral-300/50 mt-4">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-lg transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

