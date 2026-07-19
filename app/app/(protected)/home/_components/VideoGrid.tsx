"use client"

import React, { useEffect, useState } from "react"
import VideoCard, { VideoCardSkeleton } from "./VideoCard"
import { getPublicVideos } from "@/lib/apis/video"

// Matches the GET /videos/ response — the single source of truth now
export interface Video {
  id: string
  title: string
  category: string
  thumbnail_url: string | null
  age_rating: string | null
  views_count: number
  created_at: string
  user_id: string
  description: string | null
  tags: string[]
}

const VideoGrid = () => {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPublicVideos()
      .then(setVideos)          // response is a bare array
      .catch(() => setError("Couldn't load videos. Try refreshing the page."))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="eyebrow">Browse videos</h2>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <p className="text-muted-foreground">{error}</p>
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
