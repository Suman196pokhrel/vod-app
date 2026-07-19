"use client"

import { useCallback, useState } from "react"

// In-memory only, by design — theater mode always starts off on a fresh
// page load rather than persisting across visits.
export function useTheaterMode() {
  const [theater, setTheater] = useState(false)
  const toggle = useCallback(() => setTheater((t) => !t), [])
  return { theater, toggle }
}