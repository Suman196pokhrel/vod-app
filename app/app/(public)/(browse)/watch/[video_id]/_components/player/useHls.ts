"use client"

import { useEffect, useRef, useState, type RefObject } from "react"
import Hls from "hls.js"
import type { QualityLevel } from "./types"

// Autoplay with sound if the browser allows it; browsers that block unmuted
// autoplay reject the play() promise with NotAllowedError, so fall back to
// muted playback — always permitted — rather than leaving the video paused.
function attemptAutoplay(el: HTMLVideoElement) {
  el.play().catch(() => {
    el.muted = true
    void el.play()
  })
}

export function useHls(
  videoRef: RefObject<HTMLVideoElement | null>,
  manifestUrl: string | null
) {
  const hlsRef = useRef<Hls | null>(null)
  const [qualities, setQualities] = useState<QualityLevel[]>([])
  const [autoHeight, setAutoHeight] = useState<number | null>(null)
  const [fatalError, setFatalError] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el || !manifestUrl) return

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true })
      hlsRef.current = hls
      hls.loadSource(manifestUrl)
      hls.attachMedia(el)

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        setQualities(
          data.levels
            .map((l, i) => ({ index: i, height: l.height }))
            .sort((a, b) => b.height - a.height)
        )
        attemptAutoplay(el)
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        setAutoHeight(hls.levels[data.level]?.height ?? null)
      })

      // Recover from transient network/media errors instead of dying
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
        else setFatalError(true)
      })

      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    }

    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = manifestUrl
      el.addEventListener("loadedmetadata", () => attemptAutoplay(el), { once: true })
    }
  }, [videoRef, manifestUrl])

  const setLevel = (index: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = index
  }

  return { qualities, autoHeight, setLevel, fatalError }
}