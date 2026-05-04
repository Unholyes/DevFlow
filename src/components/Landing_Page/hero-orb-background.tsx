"use client"

import dynamic from "next/dynamic"

const Orb = dynamic(() => import("@/components/react-bits/Orb/Orb"), { ssr: false })

export function HeroOrbBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <Orb
        hue={210}
        hoverIntensity={0.35}
        rotateOnHover={true}
        forceHoverState={false}
        backgroundColor="#ffffff"
      />
      {/* Fade/mask so hero text stays readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/10 to-white/40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0)_0%,rgba(255,255,255,0.35)_55%,rgba(255,255,255,0.65)_85%)]" />
    </div>
  )
}

