"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Delay in ms before the reveal transition starts.
   */
  delayMs?: number
}

export function ScrollReveal({
  className,
  delayMs = 0,
  children,
  ...props
}: ScrollRevealProps) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { root: null, rootMargin: "0px 0px -15% 0px", threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        "transform-gpu transition-[opacity,transform,filter] duration-700 ease-out motion-reduce:transition-none",
        visible
          ? "opacity-100 translate-y-0 blur-0"
          : "opacity-0 translate-y-6 blur-[2px]",
        className
      )}
      style={{
        ...(props.style ?? {}),
        transitionDelay: `${delayMs}ms`,
      }}
    >
      {children}
    </div>
  )
}

