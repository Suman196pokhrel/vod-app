"use client"

import React from "react"
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

  return (
    <button
      type="button"
      onClick={() => router.push(`/home/watch/${video.id}`)}
      className="group block w-full text-left transition-transform duration-(--duration-fast) ease-(--ease-out-quart) hover:scale-[1.02] focus-visible:scale-[1.02]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden rounded-lg bg-card">
        {video.thumbnail_url ? (
          <Image
            src={storageUrl(video.thumbnail_url)}
            alt={video.title}
            fill
            className="object-cover transition-[filter] duration-(--duration-fast) ease-(--ease-out-quart) group-hover:brightness-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-subtle">
            No thumbnail
          </div>
        )}

        {/* Age rating badge */}
        {video.age_rating && (
          <span className="eyebrow absolute bottom-2 right-2 rounded-sm bg-surface-watch/70 px-1.5 py-0.5 text-foreground backdrop-blur-sm">
            {video.age_rating}
          </span>
        )}
      </div>

      {/* Info — separation by space, not borders */}
      <div className="mt-3 space-y-1 px-0.5">
        <h3 className="line-clamp-1 font-display text-base font-semibold underline-offset-4 transition-colors duration-(--duration-fast) group-hover:underline group-hover:decoration-primary">
          {video.title}
        </h3>
        <p className="eyebrow">
          {video.category} · {formatViews(video.views_count)} views
        </p>
      </div>
    </button>
  )
}

/**
 * Content-shaped loading state — render a grid of these while videos load.
 * (docs/DESIGN_SYSTEM.md §2 Loading: skeletons, never spinners, for content areas.)
 */
export const VideoCardSkeleton = () => (
  <div className="w-full">
    <div className="skeleton aspect-video w-full rounded-lg" />
    <div className="mt-3 space-y-2 px-0.5">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-3 w-1/2" />
    </div>
  </div>
)

export default VideoCard
