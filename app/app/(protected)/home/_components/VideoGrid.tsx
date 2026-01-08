// app/home/_components/video-grid.tsx
import React from 'react'
import VideoCard from './VideoCard'

export interface Video {
  id: string
  title: string
  thumbnail: string
  duration: string
  views: string
  category: string
  description: string
  releaseDate: string
  rating: number // out of 5
  ageRating: string // "PG", "PG-13", "R", "TV-MA", etc.
  director?: string
  cast?: string[]
  tags: string[]
  isNew?: boolean
  isTrending?: boolean
  isFeatured?: boolean
  videoUrl?: string // for future video playback
  trailerUrl?: string
}

const VideoGrid = () => {
  const videos: Video[] = [
    {
      id: "b5d58f9d-e952-4c56-b2bb-6e959b937bca",
      title: "Stranger Things: Season 4",
      thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
      duration: "2h 15m",
      views: "12.5M",
      category: "Sci-Fi Thriller",
      description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
      releaseDate: "2024-05-27",
      rating: 4.7,
      ageRating: "TV-14",
      director: "The Duffer Brothers",
      cast: ["Millie Bobby Brown", "Finn Wolfhard", "Winona Ryder"],
      tags: ["sci-fi", "thriller", "supernatural", "80s"],
      isNew: true,
      isTrending: true,
      isFeatured: true,
      videoUrl: "/videos/stranger-things-s4.mp4",
      trailerUrl: "/trailers/stranger-things-s4.mp4"
    }

  ]

  return (
    <div className="w-full max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Browse Videos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {videos.map((video) => (
            <VideoCard key={video.id} {...video} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default VideoGrid