"use client"

import { useEffect, useState } from "react"
import { parseMediaFragment, type ThumbnailImage } from "@videojs/core"
import { storageUrl } from "./utils"

// @videojs/react's <Slider.Thumbnail> can auto-detect a metadata <track> on
// the video and derive thumbnails from its cues, but its internal base-URL
// resolution for the track's own src doesn't come through for our
// cross-origin storage host — the bare `sprite_000.jpg#xywh=...` cue text
// the backend emits ends up resolved against the *page's* URL instead of
// the VTT's, 404ing. We also tried parsing it via a detached <video>/<track>
// pair to reuse the browser's native WebVTT parser, sidestepping just the
// base-URL bug — but native <track> loading turned out to be unreliable
// independent of that (observed stuck in the "none" ready state even for a
// trivial same-origin blob: URL, unrelated to CORS). A plain fetch + a
// small hand-rolled parser for our own fixed, backend-generated format
// avoids the native track pipeline entirely.
const CUE_TIMING_RE = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/

function parseTimestamp(h: string, m: string, s: string, ms: string): number {
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000
}

function parseStoryboardVtt(vttText: string, baseURL: string): ThumbnailImage[] {
  const thumbnails: ThumbnailImage[] = []
  const lines = vttText.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const match = CUE_TIMING_RE.exec(lines[i].trim())
    if (!match) continue

    const cueText = lines[i + 1]?.trim()
    if (!cueText) continue

    const fragment = parseMediaFragment(cueText, baseURL)
    const thumbnail: ThumbnailImage = {
      url: fragment.url,
      startTime: parseTimestamp(match[1], match[2], match[3], match[4]),
      endTime: parseTimestamp(match[5], match[6], match[7], match[8]),
    }
    if (fragment.width) thumbnail.width = fragment.width
    if (fragment.height) thumbnail.height = fragment.height
    if (fragment.coords) thumbnail.coords = fragment.coords
    thumbnails.push(thumbnail)
  }

  return thumbnails
}

export function useStoryboardThumbnails(storyboardPath?: string | null): ThumbnailImage[] | undefined {
  const [result, setResult] = useState<{ path: string; thumbnails: ThumbnailImage[] } | null>(null)

  useEffect(() => {
    if (!storyboardPath) return

    const src = storageUrl(storyboardPath)
    let cancelled = false

    fetch(src)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`storyboard fetch failed: ${res.status}`))))
      .then((text) => {
        if (!cancelled) setResult({ path: storyboardPath, thumbnails: parseStoryboardVtt(text, src) })
      })
      .catch(() => {
        if (!cancelled) setResult({ path: storyboardPath, thumbnails: [] })
      })

    return () => {
      cancelled = true
    }
  }, [storyboardPath])

  // A result from a previous storyboardPath (still in state while the new
  // path's fetch is in flight) reads as "not loaded yet" rather than
  // flashing the wrong video's thumbnails.
  if (!storyboardPath || result?.path !== storyboardPath) return undefined
  return result.thumbnails
}
