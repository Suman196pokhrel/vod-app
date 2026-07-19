"use client"

import { useState } from "react"
import { Star, Sparkles } from "lucide-react"
import { MorphIcon } from "@/lib/motion/MorphIcon"

/** Star rating glyph that morphs into a sparkle burst on hover. */
export function RatingStar({ className }: { className?: string }) {
  const [hovered, setHovered] = useState(false)

  return (
    <span
      className={`relative inline-flex h-3.5 w-3.5 items-center justify-center ${className ?? ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <MorphIcon from={Star} to={Sparkles} active={hovered} size={14} />
    </span>
  )
}
