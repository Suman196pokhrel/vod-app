// app/home/watch/[id]/_components/VideoStats.tsx
import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, Clock, Calendar, Star } from 'lucide-react'
import { Video } from '../../../_components/VideoGrid'

interface VideoStatsProps {
  video: Video
}

const VideoStats = ({ video }: VideoStatsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{video.views}</p>
            <p className="text-xs text-muted-foreground">Views</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Star className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{video.rating}</p>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{video.duration}</p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{new Date(video.releaseDate).getFullYear()}</p>
            <p className="text-xs text-muted-foreground">Release</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default VideoStats