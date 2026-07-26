"use client"

import { VideoJsSkin } from "./videojs-skin/Skin"
import { storageUrl } from "./utils"
import { useStoryboardThumbnails } from "./useStoryboardThumbnails"
import type { VideoData } from "./types"

interface VideoPlayerProps {
  video: VideoData
  className?: string
}

export default function VideoPlayer({ video, className }: VideoPlayerProps) {
  const thumbnails = useStoryboardThumbnails(video.storyboard_url)

  if (!video.manifest_url) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-card text-sm text-muted-foreground">
        This video is still processing. Check back shortly.
      </div>
    )
  }

  return (
    <VideoJsSkin
      src={storageUrl(video.manifest_url)}
      poster={video.thumbnail_url ? storageUrl(video.thumbnail_url) : undefined}
      thumbnails={thumbnails}
      className={`overflow-hidden ${className ?? "aspect-video w-full"}`}
    />
  )
}
