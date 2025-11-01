// app/(admin)/admin/dashboard/_components/PopularVideos.tsx
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, TrendingUp } from 'lucide-react'
import Image from 'next/image'

const PopularVideos = () => {
  const videos = [
    {
      id: '1',
      title: 'Stranger Things: Season 4',
      thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80',
      views: '2.4M',
      trend: '+12%'
    },
    {
      id: '2',
      title: 'The Last of Us',
      thumbnail: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&q=80',
      views: '1.8M',
      trend: '+8%'
    },
    {
      id: '3',
      title: 'The Witcher',
      thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&q=80',
      views: '1.5M',
      trend: '+15%'
    },
    {
      id: '4',
      title: 'Breaking Bad',
      thumbnail: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&q=80',
      views: '1.2M',
      trend: '+5%'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Top Performing Videos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <span className="text-2xl font-bold text-muted-foreground/30 w-6">
                {index + 1}
              </span>
              <div className="relative w-20 aspect-video rounded overflow-hidden flex-shrink-0">
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm line-clamp-1">{video.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {video.views}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {video.trend}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default PopularVideos