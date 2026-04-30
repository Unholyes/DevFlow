"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  reverse?: boolean
  pauseOnHover?: boolean
  vertical?: boolean
  repeat?: number
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  vertical = false,
  repeat = 4,
  children,
  ...props
}: MarqueeProps) {
  const items = React.useMemo(() => {
    const arr = React.Children.toArray(children)
    return arr.length === 0 ? [] : arr
  }, [children])

  return (
    <div
      {...props}
      className={cn(
        "group flex overflow-hidden [gap:var(--gap)] [--gap:1rem]",
        vertical ? "flex-col" : "flex-row",
        className
      )}
    >
      {Array.from({ length: repeat }).map((_, groupIndex) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={groupIndex}
          className={cn(
            "flex shrink-0 [gap:var(--gap)] [will-change:transform]",
            vertical ? "flex-col" : "flex-row",
            vertical ? "animate-marquee-vertical" : "animate-marquee",
            reverse && (vertical ? "animate-marquee-vertical-reverse" : "animate-marquee-reverse"),
            pauseOnHover && "group-hover:[animation-play-state:paused]"
          )}
        >
          {items.map((child, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <React.Fragment key={`${groupIndex}-${i}`}>{child}</React.Fragment>
          ))}
        </div>
      ))}
    </div>
  )
}

