"use client"

import React from 'react'
import { usePublicVideos } from '@/hooks/video/use-public-videos'
import VideoCard, { VideoCardSkeleton } from '@/app/(public)/(browse)/_components/VideoCard'

interface RelatedVideosProps {
  currentVideoId: string
  category: string
}

const RelatedVideos = ({ currentVideoId, category }: RelatedVideosProps) => {
  // Shares its cache entry with the browse page's Hero/Grid (same
  // skip/limit) — navigating browse -> watch within staleTime reuses the
  // already-fetched list instead of firing a new request.
  const { data, isPending } = usePublicVideos(0, 20)

  const videos = data
    ? [...data]
        .filter((v) => v.id !== currentVideoId)
        // Same-category videos first, then everything else.
        .sort((a, b) => Number(b.category === category) - Number(a.category === category))
        .slice(0, 10)
    : []

  return (
    <div className="space-y-3">
      <h2 className="text-xl">Related Videos</h2>
      <div className="space-y-3">
        {isPending &&
          Array.from({ length: 4 }).map((_, i) => <VideoCardSkeleton key={i} />)}

        {!isPending && videos.length === 0 && (
          <p className="text-sm text-muted-foreground">No other videos yet.</p>
        )}

        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  )
}

export default RelatedVideos
