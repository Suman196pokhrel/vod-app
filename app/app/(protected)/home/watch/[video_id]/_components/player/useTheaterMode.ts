"use client"

import { useCallback, useEffect, useState } from "react"

export function useTheaterMode() {
  const [theater, setTheater] = useState(false)

  // Read after mount — localStorage doesn't exist during SSR
  useEffect(() => {
    setTheater(localStorage.getItem("vod:theater") === "1")
  }, [])

  const toggle = useCallback(() => {
    setTheater((t) => {
      localStorage.setItem("vod:theater", t ? "0" : "1")
      return !t
    })
  }, [])

  return { theater, toggle }
}