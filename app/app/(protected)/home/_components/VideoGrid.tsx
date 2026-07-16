"use client"

import React, { useEffect, useState } from "react"
import VideoCard from "./VideoCard"
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
      .catch(() => setError("Couldn't load videos."))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="px-4 text-muted-foreground">Loading videos…</p>
  if (error) return <p className="px-4 text-muted-foreground">{error}</p>
  if (videos.length === 0)
    return <p className="px-4 text-muted-foreground">No videos yet. Upload one to get started.</p>

  return (
    <div className="w-full max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Browse Videos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default VideoGrid