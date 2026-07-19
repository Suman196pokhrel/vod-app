"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export function useControlsVisibility(isPlaying: boolean, delay = 5000) {
  const [visible, setVisible] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lockRef = useRef(false)

  const nudge = useCallback(() => {
    setVisible(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (!lockRef.current) setVisible(false)
    }, delay)
  }, [delay])

  // Keep controls pinned while a menu is open
  const setLock = useCallback((locked: boolean) => {
    lockRef.current = locked
    if (locked) {
      if (timer.current) clearTimeout(timer.current)
      setVisible(true)
    } else nudge()
  }, [nudge])

  useEffect(() => {
    if (!isPlaying) {
      if (timer.current) clearTimeout(timer.current)
      setVisible(true)
    } else nudge()
  }, [isPlaying, nudge])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const hideNow = useCallback(() => {
    if (isPlaying && !lockRef.current) setVisible(false)
  }, [isPlaying])

  return { visible, nudge, hideNow, setLock }
}