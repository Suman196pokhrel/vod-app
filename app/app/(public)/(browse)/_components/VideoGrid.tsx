"use client"

import VideoCard, { VideoCardSkeleton } from "./VideoCard"
import { usePublicVideos } from "@/hooks/video/use-public-videos"

const VideoGrid = () => {
  const { data: videos, isPending, isError } = usePublicVideos(0, 20)

  return (
    <div className="space-y-6">
      <h2 className="eyebrow">Browse videos</h2>

      {isPending ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <p className="text-muted-foreground">Couldn't load videos. Try refreshing the page.</p>
      ) : videos.length === 0 ? (
        <p className="text-muted-foreground">No videos yet. Upload one to get started.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}

export default VideoGrid
