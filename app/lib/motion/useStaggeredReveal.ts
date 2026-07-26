"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"

/**
 * Staggered fade+slide-up reveal for a container's direct children, on
 * mount or whenever `deps` changes — the cinematic load-in companion to
 * useScrollReveal's scroll-triggered version. Attach the returned ref to a
 * wrapping element; each direct child animates in with a slight delay after
 * the previous one.
 */
export function useStaggeredReveal<T extends HTMLElement>(deps: React.DependencyList = []) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || el.children.length === 0) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const tween = gsap.from(el.children, {
      opacity: 0,
      y: 20,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.08,
    })
    return () => {
      tween.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ref
}
