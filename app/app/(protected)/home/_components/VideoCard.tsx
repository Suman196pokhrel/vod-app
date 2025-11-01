"use client"

import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import Image from 'next/image'

interface VideoCardProps {
  title: string
  thumbnail: string
  duration: string
  views: string
  category: string
  isNew?: boolean
}

const VideoCard = ({ 
  title = "Stranger Things: Season 4",
  thumbnail = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
  duration = "2h 15m",
  views = "12.5M",
  category = "Sci-Fi Thriller",
  isNew = true
}: Partial<VideoCardProps>) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card 
      className="group relative border-none bg-transparent transition-all duration-300 cursor-pointer p-0 pb-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0">
        {/* Thumbnail Container */}
        <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
          {/* Thumbnail Image */}
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover transition-all duration-300 group-hover:brightness-90"
          />
          
          {/* Subtle Gradient Overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
          
          {/* Duration Badge */}
          <Badge 
            variant="secondary" 
            className="absolute bottom-2 right-2 bg-black/70 text-white border-none backdrop-blur-sm text-xs"
          >
            <Clock className="w-3 h-3 mr-1" />
            {duration}
          </Badge>
        </div>

        {/* Video Info */}
        <div className="mt-2">
          {/* Title and Category */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="px-2 font-semibold text-base line-clamp-1 transition-colors duration-200">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5 px-2">
                {category}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground px-2 mt-1">
            <span>{views} views</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default VideoCard