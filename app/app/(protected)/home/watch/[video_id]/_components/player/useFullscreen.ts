"use client"

import { useCallback, useEffect, useState, type RefObject } from "react"

export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void ref.current?.requestFullscreen()
  }, [ref])

  return { fullscreen, toggle }
}