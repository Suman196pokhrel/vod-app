"use client"

import { useState } from "react"
import { Check, ChevronLeft, ChevronRight, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SPEEDS } from "./utils"
import type { QualityLevel } from "./types"

interface Props {
  speed: number
  onSpeedChange: (s: number) => void
  qualities: QualityLevel[]
  quality: number
  autoHeight: number | null
  onQualityChange: (i: number) => void
  onOpenChange: (open: boolean) => void
}

type Panel = "root" | "speed" | "quality"

export function SettingsMenu({
  speed, onSpeedChange, qualities, quality, autoHeight, onQualityChange, onOpenChange,
}: Props) {
  const [panel, setPanel] = useState<Panel>("root")

  const speedLabel = speed === 1 ? "Normal" : `${speed}×`
  const qualityLabel =
    quality === -1
      ? autoHeight ? `Auto (${autoHeight}p)` : "Auto"
      : `${qualities.find((q) => q.index === quality)?.height}p`

  return (
    <Popover
      onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(() => setPanel("root"), 200) }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon"
          className="h-9 w-9 text-foreground transition-transform hover:rotate-45 hover:bg-accent hover:text-accent-foreground"
          aria-label="Settings">
          <Settings className="h-[18px] w-[18px]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end" sideOffset={12}
        className="w-56 overflow-hidden border-border bg-popover/90 p-1 text-popover-foreground shadow-2xl backdrop-blur-2xl"
      >
        {panel === "root" && (
          <div className="space-y-0.5">
            <Row label="Playback speed" value={speedLabel} onClick={() => setPanel("speed")} />
            <Row label="Quality" value={qualityLabel} onClick={() => setPanel("quality")} />
          </div>
        )}

        {panel === "speed" && (
          <Panel title="Playback speed" onBack={() => setPanel("root")}>
            {SPEEDS.map((s) => (
              <Option key={s} label={s === 1 ? "Normal" : `${s}×`} active={speed === s}
                onClick={() => { onSpeedChange(s); setPanel("root") }} />
            ))}
          </Panel>
        )}

        {panel === "quality" && (
          <Panel title="Quality" onBack={() => setPanel("root")}>
            <Option
              label="Auto" hint={autoHeight ? `${autoHeight}p` : undefined}
              active={quality === -1}
              onClick={() => { onQualityChange(-1); setPanel("root") }}
            />
            {qualities.map((q) => (
              <Option key={q.index} label={`${q.height}p`} active={quality === q.index}
                onClick={() => { onQualityChange(q.index); setPanel("root") }} />
            ))}
          </Panel>
        )}
      </PopoverContent>
    </Popover>
  )
}

function Row({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs transition-colors hover:bg-accent hover:text-accent-foreground">
      <span>{label}</span>
      <span className="flex items-center gap-1 text-muted-foreground">
        {value}<ChevronRight className="h-3 w-3" />
      </span>
    </button>
  )
}

function Panel({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="animate-in slide-in-from-right-2 fade-in duration-(--duration-base)">
      <button onClick={onBack}
        className="mb-1 flex w-full items-center gap-1.5 border-b border-border px-2 py-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
        <ChevronLeft className="h-3.5 w-3.5" />{title}
      </button>
      <div className="max-h-64 space-y-0.5 overflow-y-auto">{children}</div>
    </div>
  )
}

function Option({ label, hint, active, onClick }: { label: string; hint?: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground">
      <span className="flex items-center gap-2">
        <Check className={`h-3 w-3 text-primary transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
        {label}
      </span>
      {hint && <span className="text-muted-foreground">{hint}</span>}
    </button>
  )
}