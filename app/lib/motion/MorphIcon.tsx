"use client"

import { useLayoutEffect, useRef } from "react"
import gsap from "gsap"
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin"
import type { LucideIcon } from "lucide-react"

let registered = false
function ensureRegistered() {
  if (registered) return
  gsap.registerPlugin(MorphSVGPlugin)
  registered = true
}

// Every subpath of an icon's shapes (path/circle/rect/line/polyline/polygon,
// converted to <path> via MorphSVGPlugin) merged into ONE combined `d`
// string. SVG supports multiple "M...Z" subpaths inside a single `d`, so
// this collapses a multi-shape icon (e.g. Ghost's 3 shapes) down to a
// single path — giving a clean 1:1 morph target instead of an ambiguous
// N-shapes-to-M-shapes correspondence problem.
function mergedPathD(el: SVGSVGElement | SVGElement): string {
  const nodes = Array.from(
    el.querySelectorAll("path, circle, rect, line, polyline, polygon, ellipse")
  )
  // swap:true actually replaces each shape with a <path> in the live DOM —
  // required so the later querySelectorAll("path") in this component can
  // find something to morph (LayoutGrid/rects, Rocket/multi-shape, etc.
  // would otherwise have zero <path> elements to target).
  const shapes = MorphSVGPlugin.convertToPath(nodes as unknown as string[], true)
  return shapes.map((p) => p.getAttribute("d") ?? "").join(" ")
}

interface MorphIconProps {
  /** Icon shown at rest. */
  from: LucideIcon
  /** Icon shape the `from` icon morphs into when `active` is true. */
  to: LucideIcon
  active: boolean
  className?: string
  size?: number
  "aria-hidden"?: boolean
}

/**
 * True SVG path-to-path morph between two lucide icons via GSAP
 * MorphSVGPlugin — not a crossfade. Multi-shape icons are merged into one
 * path first (see mergedPathD) so the morph is always a single clean
 * interpolation. Falls back to an instant swap for prefers-reduced-motion.
 */
export function MorphIcon({ from: From, to: To, active, className, size = 18, ...rest }: MorphIconProps) {
  const fromRef = useRef<SVGSVGElement>(null)
  const shadowRef = useRef<SVGSVGElement>(null)
  const restD = useRef<string | null>(null)
  const activeD = useRef<string | null>(null)

  // One-time setup: merge both icons' shapes into single path strings, then
  // collapse the visible (`from`) icon down to one <path> we can tween.
  useLayoutEffect(() => {
    ensureRegistered()
    const fromEl = fromRef.current
    const shadowEl = shadowRef.current
    if (!fromEl || !shadowEl) return

    restD.current = mergedPathD(fromEl)
    activeD.current = mergedPathD(shadowEl)

    const paths = fromEl.querySelectorAll("path")
    paths.forEach((p, i) => {
      if (i === 0) {
        p.setAttribute("d", restD.current!)
      } else {
        p.remove()
      }
    })
  }, [])

  useLayoutEffect(() => {
    const fromEl = fromRef.current
    if (!fromEl || !restD.current || !activeD.current) return

    const target = fromEl.querySelector("path")
    if (!target) return

    const d = active ? activeD.current : restD.current
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reduced) {
      target.setAttribute("d", d)
      return
    }

    gsap.to(target, {
      duration: 0.4,
      ease: "power2.inOut",
      morphSVG: { shape: d },
      overwrite: true,
    })
  }, [active])

  return (
    <>
      <From ref={fromRef} width={size} height={size} className={className} {...rest} />
      <To
        ref={shadowRef}
        width={size}
        height={size}
        aria-hidden
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
      />
    </>
  )
}
