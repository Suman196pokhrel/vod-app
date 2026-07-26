"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"

/**
 * Restrained fade/scale pulse on a dropzone's drag-enter, following the
 * same ref-returning GSAP hook pattern as useScrollReveal. `isDragActive`
 * comes from react-dropzone's own state — this only reacts when it turns on.
 */
export function useDragActive<T extends HTMLElement>(isDragActive: boolean) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !isDragActive) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const tween = gsap.fromTo(
      el,
      { scale: 0.98, opacity: 0.85 },
      { scale: 1, opacity: 1, duration: 0.2, ease: "power1.out" }
    )
    return () => {
      tween.kill()
    }
  }, [isDragActive])

  return ref
}
