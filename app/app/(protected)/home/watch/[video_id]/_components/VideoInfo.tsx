// app/home/watch/[id]/_components/VideoInfo.tsx
"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ThumbsUp, ThumbsDown, Share2, Download, Plus, Check } from 'lucide-react'
import { Video } from '../../../_components/VideoGrid'

interface VideoInfoProps {
  video: Video
}

const VideoInfo = ({ video }: VideoInfoProps) => {
  const [isLiked, setIsLiked] = useState(false)
  const [isDisliked, setIsDisliked] = useState(false)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)

  return (
    <div className="space-y-4">
      {/* Title and Badges */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <h1 className="text-3xl font-bold flex-1">{video.title}</h1>
          {video.isNew && (
            <Badge variant="destructive" className="mt-1">NEW</Badge>
          )}
        </div>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary" className="font-normal">
            {video.category}
          </Badge>
          <span>•</span>
          <span>{video.views} views</span>
          <span>•</span>
          <span>{new Date(video.releaseDate).getFullYear()}</span>
          <span>•</span>
          <Badge variant="outline">{video.ageRating}</Badge>
          <span>•</span>
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">★</span>
            <span className="font-semibold text-foreground">{video.rating}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-muted rounded-full p-1">
          <Button
            size="sm"
            variant={isLiked ? "default" : "ghost"}
            className="rounded-full"
            onClick={() => {
              setIsLiked(!isLiked)
              if (isDisliked) setIsDisliked(false)
            }}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            {isLiked ? "Liked" : "Like"}
          </Button>
          <div className="w-px h-6 bg-border" />
          <Button
            size="sm"
            variant={isDisliked ? "default" : "ghost"}
            className="rounded-full"
            onClick={() => {
              setIsDisliked(!isDisliked)
              if (isLiked) setIsLiked(false)
            }}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </div>

        <Button
          size="sm"
          variant={isInWatchlist ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setIsInWatchlist(!isInWatchlist)}
        >
          {isInWatchlist ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              In Watchlist
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Watchlist
            </>
          )}
        </Button>

        <Button size="sm" variant="outline" className="rounded-full">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>

        <Button size="sm" variant="outline" className="rounded-full">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>

      {/* Director/Creator Info Card */}
      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${video.director}`} />
            <AvatarFallback>{video.director?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Created by</p>
            <p className="font-semibold">{video.director}</p>
          </div>
          <Button variant="outline" size="sm">Follow</Button>
        </div>
      </div>

      {/* Description */}
      <div className="bg-muted/30 rounded-lg p-4">
        <p className={`text-sm leading-relaxed ${!showFullDescription && 'line-clamp-3'}`}>
          {video.description}
        </p>
        <Button
          variant="link"
          className="mt-2 p-0 h-auto"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? 'Show less' : 'Show more'}
        </Button>
      </div>

      {/* Cast */}
      {video.cast && video.cast.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Cast</h3>
          <div className="flex flex-wrap gap-2">
            {video.cast.map((actor, index) => (
              <Badge key={index} variant="secondary" className="font-normal">
                {actor}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div>
        <h3 className="font-semibold mb-2">Tags</h3>
        <div className="flex flex-wrap gap-2">
          {video.tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="font-normal cursor-pointer hover:bg-muted">
              #{tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

export default VideoInfo