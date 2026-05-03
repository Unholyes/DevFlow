"use client"

import dynamic from "next/dynamic"

const Orb = dynamic(() => import("@/components/react-bits/Orb/Orb"), { ssr: false })

export function OrbSection() {
  return (
    <section className="relative w-full bg-white">
      <div className="relative h-[360px] md:h-[460px] w-full">
        <Orb hoverIntensity={0.5} rotateOnHover={true} hue={210} forceHoverState={false} backgroundColor="#ffffff" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-white/60 to-white" />
      </div>
    </section>
  )
}

