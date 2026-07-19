"use client"

import { useCallback, useRef, useState } from "react"
import { useHls } from "./useHls"
import { usePlayerState } from "./usePlayerState"
import { useControlsVisibility } from "./useControlVisibility"
import { useFullscreen } from "./useFullscreen"
import { useKeyboardShortcuts } from "./useKeyboardShortcuts"
import { BufferingSpinner } from "./BufferingSpinner"
import { CenterPlayButton } from "./CenterPlayButton"
import { PlayPauseFlash } from "./PlayPauseFlash"
import { ControlBar } from "./ControlBar"
import { storageUrl } from "./utils"
import type { VideoData } from "./types"

interface VideoPlayerProps {
  video: VideoData
  theater: boolean
  onToggleTheater: () => void
  className?:string
}

export default function VideoPlayer({ video, theater, onToggleTheater, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)

  const [scrubbing, setScrubbing] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [quality, setQuality] = useState(-1)

  const manifestUrl = video.manifest_url ? storageUrl(video.manifest_url) : null
  const { qualities, autoHeight, setLevel, fatalError } = useHls(videoRef, manifestUrl)

  const s = usePlayerState(videoRef, scrubbing)
  const { visible, nudge, hideNow, setLock } = useControlsVisibility(s.isPlaying)
  const { fullscreen, toggle: toggleFullscreen } = useFullscreen(shellRef)

  useKeyboardShortcuts(shellRef, {
    togglePlay: s.togglePlay,
    seekBy: s.seekBy,
    toggleFullscreen,
    toggleMute: s.toggleMute,
    adjustVolume: (d) => s.setVolumeTo(s.volume + d),
    onActivity: nudge,
  })

  const applySpeed = useCallback((sp: number) => {
    if (videoRef.current) videoRef.current.playbackRate = sp
    setSpeed(sp)
  }, [])

  const applyQuality = useCallback((i: number) => {
    setLevel(i)
    setQuality(i)
  }, [setLevel])

  if (!video.manifest_url) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-card text-sm text-muted-foreground">
        This video is still processing. Check back shortly.
      </div>
    )
  }

  if (fatalError) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-card text-sm text-muted-foreground">
        Playback failed. Try reloading the page.
      </div>
    )
  }

  return (
    <div
      ref={shellRef}
      tabIndex={0}
      onPointerMove={nudge}
      onPointerLeave={hideNow}
      className={`group relative select-none overflow-hidden bg-card outline-none transition-[border-radius] duration-(--duration-fast) ease-(--ease-out-quart) focus-visible:ring-2 focus-visible:ring-ring/50 ${
        fullscreen ? "rounded-none" : "rounded-xl border border-border/60"
      } ${visible ? "cursor-default" : "cursor-none"} ${className ?? "aspect-video w-full"}`}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        poster={video.thumbnail_url ? storageUrl(video.thumbnail_url) : undefined}
        playsInline
        onClick={s.togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      <BufferingSpinner show={s.waiting && !s.ended} />
      <PlayPauseFlash isPlaying={s.isPlaying} started={s.started} />
      <CenterPlayButton show={!s.started || s.ended} onClick={s.togglePlay} />

      <ControlBar
        visible={visible}
        isPlaying={s.isPlaying}
        currentTime={s.currentTime}
        duration={s.duration}
        buffered={s.buffered}
        volume={s.volume}
        muted={s.muted}
        theater={theater}
        onToggleTheater={onToggleTheater}
        fullscreen={fullscreen}
        speed={speed}
        qualities={qualities}
        quality={quality}
        autoHeight={autoHeight}
        onTogglePlay={s.togglePlay}
        onSeekBy={s.seekBy}
        onScrubStart={() => setScrubbing(true)}
        onScrub={s.setCurrentTime}
        onScrubEnd={(t) => { s.seekTo(t); setScrubbing(false) }}
        onToggleMute={s.toggleMute}
        onVolumeChange={s.setVolumeTo}
        onToggleFullscreen={toggleFullscreen}
        onSpeedChange={applySpeed}
        onQualityChange={applyQuality}
        onMenuOpenChange={setLock}
      />
    </div>
  )
}