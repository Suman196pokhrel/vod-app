"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"
import { Pause, Play, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface VideoData {
  id: string
  title: string
  thumbnail_url?: string | null
  manifest_url?: string | null // stored as "/vod-processed/{id}/segments/master.m3u8"
}

interface VideoPlayerProps {
  video: VideoData
}

// Turn a stored MinIO path into a browser-reachable URL via the Caddy /storage route.
const storageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_API_URL}/storage${path}`

const formatTime = (s: number) => {
  if (!Number.isFinite(s)) return "0:00"
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, "0")
  return `${m}:${sec}`
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  // Refs = handles to things that live OUTSIDE React's render cycle:
  // the actual <video> DOM element, and the Hls instance managing it.
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [qualities, setQualities] = useState<{ index: number; height: number }[]>([])
  const [quality, setQuality] = useState(-1) // -1 = Auto (HLS picks based on bandwidth)

  // Set up HLS: runs once when the component mounts 
  useEffect(() => {
    const el = videoRef.current
    if (!el || !video.manifest_url) return

    const manifestUrl = storageUrl(video.manifest_url)

    if (Hls.isSupported()) {
      // hls.js downloads the manifest, picks a quality, fetches .ts segments,
      // and feeds them into the <video> element.
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(manifestUrl)
      hls.attachMedia(el)

      // Once the master manifest is parsed we know which qualities exist.
      hls.on(Hls.Events.MANIFEST_PARSED, (_evt, data) => {
        setQualities(
          data.levels
            .map((l, i) => ({ index: i, height: l.height }))
            .sort((a, b) => b.height - a.height)
        )
      })

      // Cleanup when leaving the page — stops downloads, frees memory.
      return () => hls.destroy()
    }

    // Safari plays HLS natively — no hls.js needed, just set src.
    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = manifestUrl
    }
  }, [video.manifest_url])

  // Keep React state in sync with what the <video> element does 
  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onTimeUpdate = () => setCurrentTime(el.currentTime)
    const onDurationChange = () => setDuration(el.duration)

    el.addEventListener("play", onPlay)
    el.addEventListener("pause", onPause)
    el.addEventListener("timeupdate", onTimeUpdate)
    el.addEventListener("durationchange", onDurationChange)
    return () => {
      el.removeEventListener("play", onPlay)
      el.removeEventListener("pause", onPause)
      el.removeEventListener("timeupdate", onTimeUpdate)
      el.removeEventListener("durationchange", onDurationChange)
    }
  }, [])

  //  Controls 
  const togglePlay = () => {
    const el = videoRef.current
    if (!el) return
    el.paused ? void el.play() : el.pause()
  }

  const onSeek = (value: number[]) => {
    const el = videoRef.current
    if (!el) return
    el.currentTime = value[0]
    setCurrentTime(value[0])
  }

  const onSelectQuality = (index: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = index // -1 restores Auto
    setQuality(index)
  }

  // Video still transcoding — nothing to play yet.
  if (!video.manifest_url) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-black text-sm text-muted-foreground">
        This video is still processing. Check back shortly.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg bg-black">
      {/* The actual video surface. Click it to toggle play. */}
      <video
        ref={videoRef}
        className="aspect-video w-full"
        poster={video.thumbnail_url ? storageUrl(video.thumbnail_url) : undefined}
        playsInline
        onClick={togglePlay}
      />

      {/* Controls bar */}
      <div className="flex items-center gap-3 bg-neutral-900 px-3 py-2">
        <Button variant="ghost" size="icon" onClick={togglePlay}>
          {isPlaying ? <Pause /> : <Play />}
        </Button>

        <span className="text-xs tabular-nums text-neutral-300">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <Slider
          value={[currentTime]}
          max={duration || 0}
          step={0.1}
          onValueChange={onSeek}
          className="flex-1"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <Settings className="h-4 w-4" />
              {quality === -1
                ? "Auto"
                : `${qualities.find((q) => q.index === quality)?.height}p`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSelectQuality(-1)}>
              Auto
            </DropdownMenuItem>
            {qualities.map((q) => (
              <DropdownMenuItem key={q.index} onClick={() => onSelectQuality(q.index)}>
                {q.height}p
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}