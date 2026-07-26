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
      {/* Title and Badges */}
      <div className="space-y-3">
        <h1 className="text-3xl">{video.title}</h1>

        {/* Metadata Row — eyebrow treatment (docs/DESIGN_SYSTEM.md §5.2) */}
        <p className="eyebrow flex flex-wrap items-center gap-x-2">
          <span>{video.category}</span>
          <span aria-hidden>·</span>
          <span>{video.views_count} views</span>
          {video.release_date && (
            <>
              <span aria-hidden>·</span>
              <span>{new Date(video.release_date).getFullYear()}</span>
            </>
          )}
          {video.age_rating && (
            <>
              <span aria-hidden>·</span>
              <span>{video.age_rating}</span>
            </>
          )}
        </p>
      </div>

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
