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
    <div className="space-y-6">
      <h2 className="text-2xl">You may also like</h2>

      {isPending ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 5 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <p className="text-muted-foreground">No other videos yet.</p>
      ) : (
        // Keyed on currentVideoId so navigating to a new video's detail page
        // remounts the grid and replays the CSS entrance animation — no
        // GSAP/scroll-gating here, see useScrollReveal.ts for why.
        <div key={currentVideoId} className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 animate-in fade-in duration-300">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}

export default RelatedVideos
