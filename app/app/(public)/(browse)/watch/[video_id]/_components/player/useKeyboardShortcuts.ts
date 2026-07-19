"use client"

import { useEffect, type RefObject } from "react"

interface Handlers {
  togglePlay: () => void
  seekBy: (d: number) => void
  toggleFullscreen: () => void
  toggleMute: () => void
  adjustVolume: (d: number) => void
  onActivity: () => void
}

export function useKeyboardShortcuts(
  shellRef: RefObject<HTMLElement | null>,
  h: Handlers
) {
  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, () => void> = {
        " ": h.togglePlay,
        k: h.togglePlay,
        ArrowLeft: () => h.seekBy(-5),
        ArrowRight: () => h.seekBy(5),
        j: () => h.seekBy(-10),
        l: () => h.seekBy(10),
        f: h.toggleFullscreen,
        m: h.toggleMute,
        ArrowUp: () => h.adjustVolume(0.1),
        ArrowDown: () => h.adjustVolume(-0.1),
      }
      const fn = map[e.key]
      if (!fn) return
      e.preventDefault()
      fn()
      h.onActivity()
    }

    shell.addEventListener("keydown", onKey)
    return () => shell.removeEventListener("keydown", onKey)
  }, [shellRef, h])
}