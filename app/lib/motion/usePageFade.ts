"use client"

import { useLayoutEffect, useRef, type DependencyList } from "react"
import gsap from "gsap"

/**
 * Fast, uniform fade+slide-up for an entire page's content on arrival —
 * deliberately NOT a stagger. Everything under the ref reaches full opacity
 * on the same frame, so nothing (e.g. a primary CTA) can be caught
 * half-invisible partway through a staggered sequence, the exact bug a
 * staggered hero button hit earlier. Use this for "the page just navigated
 * in" moments; use useStaggeredReveal when a cascading reveal across
 * several distinct elements is actually wanted.
 */
export function usePageFade<T extends HTMLElement>(deps: DependencyList = []) {
  const ref = useRef<T | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }
    )
    return () => {
      tween.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ref
}
