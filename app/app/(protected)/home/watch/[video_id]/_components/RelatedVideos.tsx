// app/home/watch/[id]/_components/RelatedVideos.tsx
"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'

interface RelatedVideosProps {
  currentVideoId: string
  category: string
}

// Mock related videos data
const mockRelatedVideos = [
  {
    id: "vid_002_the_crown_final",
    title: "The Crown: Final Season",
    thumbnail: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80",
    duration: "1h 45m",
    views: "8.3M",
    category: "Historical Drama",
    rating: 4.5,
  },
  {
    id: "vid_003_breaking_bad_complete",
    title: "Breaking Bad: Complete Series",
    thumbnail: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80",
    duration: "3h 20m",
    views: "45.2M",
    category: "Crime Drama",
    rating: 4.9,
  },
  {
    id: "vid_004_wednesday",
    title: "Wednesday",
    thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80",
    duration: "1h 30m",
    views: "23.7M",
    category: "Mystery Comedy",
    rating: 4.3,
  },
  {
    id: "vid_005_last_of_us",
    title: "The Last of Us",
    thumbnail: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=800&q=80",
    duration: "2h 05m",
    views: "34.1M",
    category: "Post-Apocalyptic",
    rating: 4.8,
  },
  {
    id: "vid_006_dark",
    title: "Dark",
    thumbnail: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800&q=80",
    duration: "1h 55m",
    views: "19.8M",
    category: "Mystery Sci-Fi",
    rating: 4.6,
  },
  {
    id: "vid_007_peaky_blinders",
    title: "Peaky Blinders",
    thumbnail: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800&q=80",
    duration: "2h 30m",
    views: "28.5M",
    category: "Period Crime",
    rating: 4.7,
  },
  {
    id: "vid_008_the_witcher",
    title: "The Witcher",
    thumbnail: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&q=80",
    duration: "1h 50m",
    views: "41.2M",
    category: "Fantasy Adventure",
    rating: 4.4,
  },
  {
    id: "vid_009_planet_earth_iii",
    title: "Planet Earth III",
    thumbnail: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
    duration: "55m",
    views: "67.3M",
    category: "Nature Documentary",
    rating: 4.9,
  },
]

const RelatedVideos = ({ currentVideoId, category }: RelatedVideosProps) => {
  const router = useRouter()
  
  // Filter out current video
  const relatedVideos = mockRelatedVideos.filter(v => v.id !== currentVideoId).slice(0, 10)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Related Videos</h2>
      <div className="space-y-3">
        {relatedVideos.map((video) => (
          <Card
            key={video.id}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => router.push(`/home/watch/${video.id}`)}
          >
            <CardContent className="p-3">
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="relative w-40 aspect-video rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={video.thumbnail}
                    alt={video.title}
                    fill
                    className="object-cover"
                  />
                  <Badge
                    variant="secondary"
                    className="absolute bottom-1 right-1 text-xs bg-black/70 text-white border-none"
                  >
                    <Clock className="w-2.5 h-2.5 mr-1" />
                    {video.duration}
                  </Badge>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                    {video.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-1">
                    {video.category}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{video.views} views</span>
                    <span>•</span>
                    <div className="flex items-center gap-0.5">
                      <span className="text-yellow-500">★</span>
                      <span>{video.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default RelatedVideos