// app/home/watch/[id]/_components/VideoInfo.tsx
"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Video } from '@/lib/types/video'

interface VideoInfoProps {
  video: Video
}

const VideoInfo = ({ video }: VideoInfoProps) => {
  const [showFullDescription, setShowFullDescription] = useState(false)

  return (
    <div className="space-y-5">
      {/* Title and metadata now live in the detail page's hero
          (watch/[video_id]/page.tsx) — this component is just the
          secondary info stack beneath it: synopsis, cast, tags. */}
      {/* Synopsis — plain text over the page background, no boxed panel */}
      <div className="space-y-3">
        {video.director && (
          <p className="text-sm text-muted-foreground">
            Directed by <span className="text-foreground">{video.director}</span>
          </p>
        )}
        {video.description && (
          <div>
            <p className={`text-sm leading-relaxed text-muted-foreground ${!showFullDescription && 'line-clamp-3'}`}>
              {video.description}
            </p>
            <Button
              variant="link"
              className="mt-1 h-auto p-0"
              onClick={() => setShowFullDescription(!showFullDescription)}
            >
              {showFullDescription ? 'Show less' : 'Show more'}
            </Button>
          </div>
        )}
      </div>

      {/* Cast */}
      {video.cast && video.cast.length > 0 && (
        <div>
          <h3 className="eyebrow mb-2">Cast</h3>
          <div className="flex flex-wrap gap-2">
            {video.cast.map((actor, index) => (
              <Badge key={index} variant="secondary" className="font-normal">
                {actor}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tags — static, no fake clickability affordance */}
      {video.tags && video.tags.length > 0 && (
        <div>
          <h3 className="eyebrow mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {video.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="font-normal">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoInfo
