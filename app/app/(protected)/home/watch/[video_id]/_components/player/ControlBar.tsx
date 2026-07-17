"use client"

import { Maximize, Minimize, Pause, Play, RotateCcw, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrubBar } from "./ScrubBar"
import { VolumeControl } from "./VolumeControl"
import { SettingsMenu } from "./SettingsMenu"
import { formatTime } from "./utils"
import type { QualityLevel } from "./types"

interface Props {
  visible: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  buffered: number
  volume: number
  muted: boolean
  fullscreen: boolean
  speed: number
  qualities: QualityLevel[]
  quality: number
  autoHeight: number | null
  onTogglePlay: () => void
  onSeekBy: (d: number) => void
  onScrubStart: () => void
  onScrub: (t: number) => void
  onScrubEnd: (t: number) => void
  onToggleMute: () => void
  onVolumeChange: (v: number) => void
  onToggleFullscreen: () => void
  onSpeedChange: (s: number) => void
  onQualityChange: (i: number) => void
  onMenuOpenChange: (open: boolean) => void
}

export function ControlBar(p: Props) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-4 pb-2.5 pt-20 transition-all duration-300 ${
        p.visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <ScrubBar
        currentTime={p.currentTime}
        duration={p.duration}
        buffered={p.buffered}
        onScrubStart={p.onScrubStart}
        onScrub={p.onScrub}
        onScrubEnd={p.onScrubEnd}
      />

      <div className="mt-0.5 flex items-center gap-0.5">
        <Button variant="ghost" size="icon" onClick={p.onTogglePlay}
          className="h-9 w-9 text-white hover:bg-white/10 hover:text-white" aria-label={p.isPlaying ? "Pause" : "Play"}>
          {p.isPlaying
            ? <Pause className="h-[18px] w-[18px] fill-white" />
            : <Play className="h-[18px] w-[18px] translate-x-px fill-white" />}
        </Button>

        <Button variant="ghost" size="icon" onClick={() => p.onSeekBy(-10)}
          className="h-9 w-9 text-white hover:bg-white/10 hover:text-white" aria-label="Back 10 seconds">
          <RotateCcw className="h-[17px] w-[17px]" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => p.onSeekBy(10)}
          className="h-9 w-9 text-white hover:bg-white/10 hover:text-white" aria-label="Forward 10 seconds">
          <RotateCw className="h-[17px] w-[17px]" />
        </Button>

        <VolumeControl
          volume={p.volume} muted={p.muted}
          onToggleMute={p.onToggleMute} onVolumeChange={p.onVolumeChange}
        />

        <span className="ml-2 select-none text-xs font-medium tabular-nums text-white">
          {formatTime(p.currentTime)}
          <span className="text-white/40"> / {formatTime(p.duration)}</span>
        </span>

        <div className="flex-1" />

        <SettingsMenu
          speed={p.speed} onSpeedChange={p.onSpeedChange}
          qualities={p.qualities} quality={p.quality} autoHeight={p.autoHeight}
          onQualityChange={p.onQualityChange} onOpenChange={p.onMenuOpenChange}
        />

        <Button variant="ghost" size="icon" onClick={p.onToggleFullscreen}
          className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
          aria-label={p.fullscreen ? "Exit fullscreen" : "Fullscreen"}>
          {p.fullscreen ? <Minimize className="h-[18px] w-[18px]" /> : <Maximize className="h-[18px] w-[18px]" />}
        </Button>
      </div>
    </div>
  )
}