"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Play } from "lucide-react"

export function PlayPauseFlash({ isPlaying, started }: { isPlaying: boolean; started: boolean }) {
  const [key, setKey] = useState(0)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (started) setKey((k) => k + 1)
  }, [isPlaying, started])

  if (!key) return null

  return (
    <div
      key={key}
      className="pointer-events-none absolute inset-0 grid place-items-center"
    >
      <span className="grid h-16 w-16 origin-center animate-[flash_0.5s_ease-out_forwards] place-items-center rounded-full bg-black/50 backdrop-blur-sm">
        {isPlaying
          ? <Play className="h-7 w-7 translate-x-0.5 fill-white text-white" />
          : <Pause className="h-7 w-7 fill-white text-white" />}
      </span>
      <style jsx>{`
        @keyframes flash {
          0%   { opacity: 0.9; transform: scale(0.8); }
          100% { opacity: 0;   transform: scale(1.5); }
        }
      `}</style>
    </div>
  )
}