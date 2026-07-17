"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Hls from "hls.js"
import {
  Pause,
  Play,
  Settings,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface VideoData {
  id: string
  title: string
  thumbnail_url?: string | null
  manifest_url?: string | null
}

interface VideoPlayerProps {
  video: VideoData

}

const storageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_API_URL}/storage${path}`

const formatTime = (s: number) => {
  if (!Number.isFinite(s)) return "0:00"
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, "0")
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${sec}` : `${m}:${sec}`
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [waiting, setWaiting] = useState(false)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [scrubbing, setScrubbing] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [speed, setSpeed] = useState(1)
  const [qualities, setQualities] = useState<{ index: number; height: number }[]>([])
  const [quality, setQuality] = useState(-1)
  const [autoHeight, setAutoHeight] = useState<number | null>(null)
  const [started, setStarted] = useState(false)

  // HLS setup
  useEffect(() => {
    const el = videoRef.current
    if (!el || !video.manifest_url) return

    const manifestUrl = storageUrl(video.manifest_url)

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false })
      hlsRef.current = hls
      hls.loadSource(manifestUrl)
      hls.attachMedia(el)

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        setQualities(
          data.levels
            .map((l, i) => ({ index: i, height: l.height }))
            .sort((a, b) => b.height - a.height)
        )
      })

      // Track what Auto actually picked, so the menu can show "Auto (720p)"
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        setAutoHeight(hls.levels[data.level]?.height ?? null)
      })

      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    }

    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = manifestUrl
    }
  }, [video.manifest_url])

  // Media element → React state
  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const onPlay = () => { setIsPlaying(true); setStarted(true) }
    const onPause = () => setIsPlaying(false)
    const onTimeUpdate = () => {
      if (!scrubbing) setCurrentTime(el.currentTime)
      const b = el.buffered
      if (b.length) setBuffered(b.end(b.length - 1))
    }
    const onDurationChange = () => setDuration(el.duration)
    const onWaiting = () => setWaiting(true)
    const onPlaying = () => setWaiting(false)
    const onVolume = () => { setVolume(el.volume); setMuted(el.muted) }

    el.addEventListener("play", onPlay)
    el.addEventListener("pause", onPause)
    el.addEventListener("timeupdate", onTimeUpdate)
    el.addEventListener("progress", onTimeUpdate)
    el.addEventListener("durationchange", onDurationChange)
    el.addEventListener("waiting", onWaiting)
    el.addEventListener("playing", onPlaying)
    el.addEventListener("volumechange", onVolume)
    return () => {
      el.removeEventListener("play", onPlay)
      el.removeEventListener("pause", onPause)
      el.removeEventListener("timeupdate", onTimeUpdate)
      el.removeEventListener("progress", onTimeUpdate)
      el.removeEventListener("durationchange", onDurationChange)
      el.removeEventListener("waiting", onWaiting)
      el.removeEventListener("playing", onPlaying)
      el.removeEventListener("volumechange", onVolume)
    }
  }, [scrubbing])

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  const togglePlay = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    el.paused ? void el.play() : el.pause()
  }, [])

  const seekBy = useCallback((delta: number) => {
    const el = videoRef.current
    if (!el) return
    el.currentTime = Math.min(Math.max(el.currentTime + delta, 0), el.duration || 0)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void shellRef.current?.requestFullscreen()
  }, [])

  const toggleMute = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    el.muted = !el.muted
  }, [])

  // Keyboard shortcuts — scoped to the player, not the whole document
  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case " ":
        case "k": e.preventDefault(); togglePlay(); break
        case "ArrowLeft": e.preventDefault(); seekBy(-5); break
        case "ArrowRight": e.preventDefault(); seekBy(5); break
        case "j": seekBy(-10); break
        case "l": seekBy(10); break
        case "f": toggleFullscreen(); break
        case "m": toggleMute(); break
        case "ArrowUp": {
          e.preventDefault()
          const el = videoRef.current
          if (el) el.volume = Math.min(el.volume + 0.1, 1)
          break
        }
        case "ArrowDown": {
          e.preventDefault()
          const el = videoRef.current
          if (el) el.volume = Math.max(el.volume - 0.1, 0)
          break
        }
      }
    }
    shell.addEventListener("keydown", onKey)
    return () => shell.removeEventListener("keydown", onKey)
  }, [togglePlay, seekBy, toggleFullscreen, toggleMute])

  // Auto-hide controls
  const nudgeControls = useCallback(() => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false)
    }, 2600)
  }, [])

  useEffect(() => {
    if (!isPlaying) setShowControls(true)
    else nudgeControls()
  }, [isPlaying, nudgeControls])

  // Scrub bar geometry
  const barRef = useRef<HTMLDivElement>(null)
  const posToTime = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect || !duration) return 0
    const pct = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
    return pct * duration
  }

  const startScrub = (e: React.PointerEvent) => {
    setScrubbing(true)
    const t = posToTime(e.clientX)
    setCurrentTime(t)
    const move = (ev: PointerEvent) => setCurrentTime(posToTime(ev.clientX))
    const up = (ev: PointerEvent) => {
      const final = posToTime(ev.clientX)
      if (videoRef.current) videoRef.current.currentTime = final
      setScrubbing(false)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const applySpeed = (s: number) => {
    if (videoRef.current) videoRef.current.playbackRate = s
    setSpeed(s)
  }

  const onSelectQuality = (index: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = index
    setQuality(index)
  }

  if (!video.manifest_url) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-neutral-950 text-sm text-neutral-400">
        This video is still processing. Check back shortly.
      </div>
    )
  }

  const pct = duration ? (currentTime / duration) * 100 : 0
  const bufPct = duration ? (buffered / duration) * 100 : 0

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <div
      ref={shellRef}
      tabIndex={0}
      onPointerMove={nudgeControls}
      onPointerLeave={() => isPlaying && setShowControls(false)}
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-white/30"
    >
      <video
        ref={videoRef}
        className="h-full w-full"
        poster={video.thumbnail_url ? storageUrl(video.thumbnail_url) : undefined}
        playsInline
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* Buffering spinner */}
      {waiting && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/80" />
        </div>
      )}

      {/* Big center play button before first playback */}
      {!started && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 grid place-items-center bg-black/20 transition hover:bg-black/30"
        >
          <span className="grid h-20 w-20 place-items-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 transition hover:scale-105 hover:bg-white/25">
            <Play className="h-8 w-8 translate-x-0.5 fill-white text-white" />
          </span>
        </button>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-16 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Scrub bar */}
        <div
          ref={barRef}
          onPointerDown={startScrub}
          onPointerMove={(e) => setHoverTime(posToTime(e.clientX))}
          onPointerLeave={() => setHoverTime(null)}
          className="group/bar relative h-6 cursor-pointer touch-none"
        >
          {hoverTime !== null && (
            <div
              className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded bg-black/90 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white ring-1 ring-white/15"
              style={{ left: `${(hoverTime / (duration || 1)) * 100}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
          <div className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-white/25 transition-[height] group-hover/bar:h-[5px]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/40"
              style={{ width: `${bufPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-violet-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div
            className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 shadow-lg transition-transform ${
              scrubbing ? "scale-100" : "scale-0 group-hover/bar:scale-100"
            }`}
            style={{ left: `${pct}%` }}
          />
        </div>

        {/* Button row */}
        <div className="mt-1 flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={togglePlay}
            className="h-9 w-9 text-white hover:bg-white/10 hover:text-white">
            {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={() => seekBy(-10)}
            className="h-9 w-9 text-white hover:bg-white/10 hover:text-white">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => seekBy(10)}
            className="h-9 w-9 text-white hover:bg-white/10 hover:text-white">
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Volume — slider expands on hover */}
          <div className="group/vol flex items-center">
            <Button variant="ghost" size="icon" onClick={toggleMute}
              className="h-9 w-9 text-white hover:bg-white/10 hover:text-white">
              <VolumeIcon className="h-5 w-5" />
            </Button>
            <input
              type="range"
              min={0} max={1} step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (videoRef.current) {
                  videoRef.current.volume = v
                  videoRef.current.muted = v === 0
                }
              }}
              className="h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/30 opacity-0 transition-all duration-200 group-hover/vol:w-20 group-hover/vol:opacity-100 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </div>

          <span className="ml-2 text-xs font-medium tabular-nums text-white/90">
            {formatTime(currentTime)} <span className="text-white/50">/ {formatTime(duration)}</span>
          </span>

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"
                className="h-9 w-9 text-white hover:bg-white/10 hover:text-white">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 border-white/10 bg-neutral-900/95 text-white backdrop-blur-xl">
              <DropdownMenuLabel className="text-xs text-white/50">Speed</DropdownMenuLabel>
              {SPEEDS.map((s) => (
                <DropdownMenuItem key={s} onClick={() => applySpeed(s)}
                  className="justify-between text-xs focus:bg-white/10 focus:text-white">
                  {s === 1 ? "Normal" : `${s}×`}
                  {speed === s && <span className="text-violet-400">✓</span>}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuLabel className="text-xs text-white/50">Quality</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onSelectQuality(-1)}
                className="justify-between text-xs focus:bg-white/10 focus:text-white">
                Auto {autoHeight && <span className="text-white/40">{autoHeight}p</span>}
                {quality === -1 && <span className="text-violet-400">✓</span>}
              </DropdownMenuItem>
              {qualities.map((q) => (
                <DropdownMenuItem key={q.index} onClick={() => onSelectQuality(q.index)}
                  className="justify-between text-xs focus:bg-white/10 focus:text-white">
                  {q.height}p
                  {quality === q.index && <span className="text-violet-400">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={toggleFullscreen}
            className="h-9 w-9 text-white hover:bg-white/10 hover:text-white">
            {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}