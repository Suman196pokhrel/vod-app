// app/home/watch/[id]/_components/VideoPlayer.tsx
"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, SkipBack, SkipForward } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import Image from 'next/image'
import { Video } from '../../../_components/VideoGrid'

interface VideoPlayerProps {
  video: Video
}

const VideoPlayer = ({ video }: VideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState([70])
  const [progress, setProgress] = useState([0])

  return (
    <div className="relative w-full bg-black group">
      {/* Video Container - 21:9 Ultra-wide aspect ratio for cinematic feel */}
      <div className="relative aspect-[21/9] bg-black">
        {/* Mock Video (Replace with actual video player) */}
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          className="object-cover"
        />

        {/* Play/Pause Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            className="h-20 w-20 rounded-full bg-white/90 hover:bg-white text-black"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause className="h-10 w-10" />
            ) : (
              <Play className="h-10 w-10 ml-1" />
            )}
          </Button>
        </div>

        {/* Custom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Progress Bar */}
          <Slider
            value={progress}
            onValueChange={setProgress}
            max={100}
            step={0.1}
            className="mb-4 cursor-pointer"
          />

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>

              {/* Skip Buttons */}
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="h-5 w-5" />
              </Button>

              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
                <Slider
                  value={volume}
                  onValueChange={setVolume}
                  max={100}
                  className="w-24"
                />
              </div>

              {/* Time Display */}
              <span className="text-white text-sm font-medium">
                0:00 / {video.duration}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Settings */}
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                <Settings className="h-5 w-5" />
              </Button>

              {/* Fullscreen */}
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPlayer