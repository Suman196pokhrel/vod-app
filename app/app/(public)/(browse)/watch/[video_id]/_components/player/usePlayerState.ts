"use client"

import { useCallback, useEffect, useState, type RefObject } from "react"
import { clamp } from "./utils"

export function usePlayerState(
  videoRef: RefObject<HTMLVideoElement | null>,
  scrubbing: boolean
) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [waiting, setWaiting] = useState(false)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const onPlay = () => { setIsPlaying(true); setStarted(true); setEnded(false) }
    const onPause = () => setIsPlaying(false)
    const onEnded = () => { setIsPlaying(false); setEnded(true) }
    const onTime = () => {
      if (!scrubbing) setCurrentTime(el.currentTime)
      const b = el.buffered
      if (b.length) setBuffered(b.end(b.length - 1))
    }
    const onDur = () => setDuration(el.duration)
    const onWaiting = () => setWaiting(true)
    const onPlaying = () => setWaiting(false)
    const onVol = () => { setVolume(el.volume); setMuted(el.muted) }

    const events: [string, () => void][] = [
      ["play", onPlay], ["pause", onPause], ["ended", onEnded],
      ["timeupdate", onTime], ["progress", onTime],
      ["durationchange", onDur], ["waiting", onWaiting],
      ["playing", onPlaying], ["volumechange", onVol],
    ]
    events.forEach(([k, fn]) => el.addEventListener(k, fn))
    return () => events.forEach(([k, fn]) => el.removeEventListener(k, fn))
  }, [videoRef, scrubbing])

  const togglePlay = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    el.paused ? void el.play() : el.pause()
  }, [videoRef])

  const seekBy = useCallback((delta: number) => {
    const el = videoRef.current
    if (!el) return
    el.currentTime = clamp(el.currentTime + delta, 0, el.duration || 0)
  }, [videoRef])

  const seekTo = useCallback((t: number) => {
    const el = videoRef.current
    if (el) el.currentTime = t
  }, [videoRef])

  const toggleMute = useCallback(() => {
    const el = videoRef.current
    if (el) el.muted = !el.muted
  }, [videoRef])

  const setVolumeTo = useCallback((v: number) => {
    const el = videoRef.current
    if (!el) return
    el.volume = clamp(v, 0, 1)
    el.muted = v === 0
  }, [videoRef])

  return {
    isPlaying, started, currentTime, duration, buffered, waiting,
    volume, muted, ended,
    setCurrentTime, togglePlay, seekBy, seekTo, toggleMute, setVolumeTo,
  }
}