"use client"

import { useLayoutEffect, useRef } from "react"
import gsap from "gsap"
import type { LucideIcon } from "lucide-react"

interface IconSwapProps {
  icon: LucideIcon
  size?: number
  className?: string
  "aria-hidden"?: boolean
}

/**
 * Smoothly swaps between icons (e.g. Play<->Pause, volume level states) via
 * a GSAP scale+rotate+fade pop — not a literal path morph (see MorphIcon
 * for that). Used where the icon set is too structurally different
 * (different shape counts/topology) to morph predictably, like lucide's
 * built-in player-control icons.
 */
export function IconSwap({ icon: Icon, size = 18, className, ...rest }: IconSwapProps) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const prevIcon = useRef<LucideIcon | null>(null)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return

    if (prevIcon.current && prevIcon.current !== Icon) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      if (!reduced) {
        gsap.fromTo(
          el,
          { scale: 0.5, rotate: -90, opacity: 0 },
          { scale: 1, rotate: 0, opacity: 1, duration: 0.3, ease: "back.out(2)", overwrite: true }
        )
      }
    }
    prevIcon.current = Icon
  }, [Icon])

  return (
    <span ref={wrapRef} className="inline-flex" style={{ transformOrigin: "50% 50%" }}>
      <Icon width={size} height={size} className={className} {...rest} />
    </span>
  )
}
