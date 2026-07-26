"use client"

import { useEffect, useState } from "react"

/** True once the page has scrolled past `threshold` px. Used by chrome that
 * sits transparent over a hero backdrop at the top of the page and needs a
 * solid surface once that backdrop scrolls out of view. */
export function useScrolled(threshold = 10) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [threshold])

  return scrolled
}
