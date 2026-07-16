"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Video } from "./VideoGrid"

// Same helper as the player — stored paths become browser URLs via Caddy /storage
const storageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_API_URL}/storage/${path}`

// 12500 → "12.5K", 12500000 → "12.5M"
const formatViews = (n: number) =>
  Intl.NumberFormat("en", { notation: "compact" }).format(n)

const VideoCard = ({ video }: { video: Video }) => {
  const router = useRouter()
console.log("API_URL:", process.env.NEXT_PUBLIC_API_URL)
console.log("thumb:", video.thumbnail_url, "→", storageUrl(video.thumbnail_url ?? ""))
  return (
    <Card
      className="group relative border-none bg-transparent transition-all duration-300 cursor-pointer p-0 pb-3"
      onClick={() => router.push(`/home/watch/${video.id}`)}
    >
      <CardContent className="p-0">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
          {video.thumbnail_url ? (
            <Image
              src={storageUrl(video.thumbnail_url)}
              alt={video.title}
              fill
              className="object-cover transition-all duration-300 group-hover:brightness-90"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              No thumbnail
            </div>
          )}

          <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />

          {/* Age rating badge (replaces the fake duration badge) */}
          {video.age_rating && (
            <Badge
              variant="secondary"
              className="absolute bottom-2 right-2 border-none bg-black/70 text-xs text-white backdrop-blur-sm"
            >
              {video.age_rating}
            </Badge>
          )}
        </div>

        {/* Info */}
        <div className="mt-2">
          <h3 className="px-2 text-base font-semibold line-clamp-1">{video.title}</h3>
          <p className="mt-0.5 px-2 text-sm text-muted-foreground">{video.category}</p>
          <div className="mt-1 px-2 text-xs text-muted-foreground">
            {formatViews(video.views_count)} views
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default VideoCard