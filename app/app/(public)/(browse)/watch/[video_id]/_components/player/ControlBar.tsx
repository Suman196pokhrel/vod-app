"use client"

import { Maximize, Minimize, Pause, Play, RotateCcw, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrubBar } from "./ScrubBar"
import { VolumeControl } from "./VolumeControl"
import { SettingsMenu } from "./SettingsMenu"
import { formatTime } from "./utils"
import type { QualityLevel } from "./types"
import { TheaterButton } from "./TheaterButton"
import { IconSwap } from "@/lib/motion/IconSwap"

interface Props {
  visible: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  buffered: number
  volume: number
  muted: boolean
  theater: boolean
  fullscreen: boolean
  speed: number
  qualities: QualityLevel[]
  quality: number
  autoHeight: number | null
  onTogglePlay: () => void
  onToggleTheater: ()=> void
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
  menuContainer?: HTMLElement | null
}

export function ControlBar(p: Props) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-surface-watch/90 via-surface-watch/40 to-transparent px-4 pb-2.5 pt-20 transition-all duration-(--duration-base) ease-(--ease-out-quart) ${
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
          className="h-10 w-10 text-foreground hover:bg-accent hover:text-accent-foreground" aria-label={p.isPlaying ? "Pause" : "Play"}>
          <IconSwap
            icon={p.isPlaying ? Pause : Play}
            size={20}
            className={p.isPlaying ? "fill-foreground" : "translate-x-px fill-foreground"}
          />
        </Button>

        <Button variant="ghost" size="icon" onClick={() => p.onSeekBy(-10)}
          className="h-10 w-10 text-foreground hover:bg-accent hover:text-accent-foreground" aria-label="Back 10 seconds">
          <RotateCcw className="h-[19px] w-[19px]" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => p.onSeekBy(10)}
          className="h-10 w-10 text-foreground hover:bg-accent hover:text-accent-foreground" aria-label="Forward 10 seconds">
          <RotateCw className="h-[19px] w-[19px]" />
        </Button>

        <VolumeControl
          volume={p.volume} muted={p.muted}
          onToggleMute={p.onToggleMute} onVolumeChange={p.onVolumeChange}
        />

        <span className="eyebrow ml-2 select-none tabular-nums">
          <span className="text-foreground">{formatTime(p.currentTime)}</span>
          {" / "}{formatTime(p.duration)}
        </span>

        <div className="flex-1" />

        <SettingsMenu
          speed={p.speed} onSpeedChange={p.onSpeedChange}
          qualities={p.qualities} quality={p.quality} autoHeight={p.autoHeight}
          onQualityChange={p.onQualityChange} onOpenChange={p.onMenuOpenChange}
          container={p.menuContainer}
        />

        {!p.fullscreen && <TheaterButton theater={p.theater} onToggle={p.onToggleTheater} />}


        <Button variant="ghost" size="icon" onClick={p.onToggleFullscreen}
          className="h-10 w-10 text-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label={p.fullscreen ? "Exit fullscreen" : "Fullscreen"}>
          {p.fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  )
}