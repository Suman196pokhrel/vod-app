"use client"

import { useEffect, useState } from "react"

/**
 * useAmbientColor — the design system's signature element (docs/DESIGN_SYSTEM.md §6).
 *
 * Extracts the average color of an image (video thumbnail) by drawing it onto a
 * tiny offscreen canvas and averaging the pixels. Used to tint the watch page
 * and the browse-page hero with the video's own atmosphere.
 *
 * Fail-silent by design: on load error or CORS taint, returns null and the UI
 * renders identically minus the glow. The glow is enhancement, never a dependency.
 *
 * Requirements:
 * - The image must be CORS-readable (`crossOrigin = "anonymous"` is set here;
 *   the storage endpoint must send permissive CORS headers — MinIO's default
 *   allows `*` for anonymous GET).
 */
export function useAmbientColor(imageUrl: string | null | undefined) {
  const [color, setColor] = useState<string | null>(null)

  useEffect(() => {
    if (!imageUrl) {
      setColor(null)
      return
    }

    let cancelled = false
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      if (cancelled) return
      try {
        const SIZE = 16 // tiny downsample: cheap and plenty for an average
        const canvas = document.createElement("canvas")
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) return

        ctx.drawImage(img, 0, 0, SIZE, SIZE)
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE)

        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < data.length; i += 4) {
          // Skip near-black and near-white pixels so letterboxing and glare
          // don't wash out the tint.
          const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
          if (lum < 16 || lum > 240) continue
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          n++
        }
        if (n === 0) return // fully black/white artwork — no glow

        setColor(
          `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`
        )
      } catch {
        // Canvas tainted (CORS) or other failure → glow simply doesn't appear.
      }
    }

    img.onerror = () => {
      /* fail silent */
    }

    img.src = imageUrl

    return () => {
      cancelled = true
    }
  }, [imageUrl])

  return { color }
}
