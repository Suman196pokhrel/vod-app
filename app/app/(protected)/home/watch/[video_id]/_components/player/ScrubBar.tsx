"use client"

import { useRef, useState } from "react"
import { formatTime, clamp } from "./utils"

interface Props {
  currentTime: number
  duration: number
  buffered: number
  onScrubStart: () => void
  onScrub: (t: number) => void
  onScrubEnd: (t: number) => void
}

export function ScrubBar({ currentTime, duration, buffered, onScrubStart, onScrub, onScrubEnd }: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const posToTime = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect || !duration) return 0
    return clamp((clientX - rect.left) / rect.width, 0, 1) * duration
  }

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true)
    onScrubStart()
    onScrub(posToTime(e.clientX))

    const move = (ev: PointerEvent) => onScrub(posToTime(ev.clientX))
    const up = (ev: PointerEvent) => {
      onScrubEnd(posToTime(ev.clientX))
      setDragging(false)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const pct = duration ? (currentTime / duration) * 100 : 0
  const bufPct = duration ? (buffered / duration) * 100 : 0

  return (
    <div
      ref={barRef}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => setHover(posToTime(e.clientX))}
      onPointerLeave={() => setHover(null)}
      className="group/bar relative h-5 cursor-pointer touch-none"
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={duration || 0}
      aria-valuenow={currentTime}
    >
      {hover !== null && duration > 0 && (
        <div
          className="pointer-events-none absolute -top-8 z-10 -translate-x-1/2 rounded-md bg-black/90 px-2 py-1 text-[11px] font-medium tabular-nums text-white ring-1 ring-white/10"
          style={{ left: `${clamp((hover / duration) * 100, 4, 96)}%` }}
        >
          {formatTime(hover)}
        </div>
      )}

      <div className={`absolute top-1/2 w-full -translate-y-1/2 overflow-hidden rounded-full bg-white/20 transition-all duration-200 ${dragging ? "h-[5px]" : "h-[3px] group-hover/bar:h-[5px]"}`}>
        <div className="absolute inset-y-0 left-0 bg-white/30 transition-[width] duration-300" style={{ width: `${bufPct}%` }} />
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-violet-400" style={{ width: `${pct}%` }} />
      </div>

      <div
        className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(139,92,246,0.8)] transition-transform duration-150 ${
          dragging ? "scale-125" : "scale-0 group-hover/bar:scale-100"
        }`}
        style={{ left: `${pct}%` }}
      />
    </div>
  )
}