"use client"

import { Volume2, Volume1, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  volume: number
  muted: boolean
  onToggleMute: () => void
  onVolumeChange: (v: number) => void
}

export function VolumeControl({ volume, muted, onToggleMute, onVolumeChange }: Props) {
  const Icon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const shown = muted ? 0 : volume

  return (
    <div className="group/vol flex items-center">
      <Button
        variant="ghost" size="icon" onClick={onToggleMute}
        className="h-9 w-9 shrink-0 text-foreground hover:bg-accent hover:text-accent-foreground"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        <Icon className="h-[18px] w-[18px]" />
      </Button>
      <div className="w-0 overflow-hidden transition-all duration-(--duration-base) ease-(--ease-out-quart) group-hover/vol:w-[76px] group-hover/vol:pl-1">
        <div className="relative h-1 w-[68px] rounded-full bg-foreground/25">
          <div className="absolute inset-y-0 left-0 rounded-full bg-foreground" style={{ width: `${shown * 100}%` }} />
          <div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
            style={{ left: `${shown * 100}%` }}
          />
          <input
            type="range" min={0} max={1} step={0.01} value={shown}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  )
}