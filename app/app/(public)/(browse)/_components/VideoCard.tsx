"use client"

import React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Play } from "lucide-react"
import { storageUrl } from "@/lib/utils/storage"
import { PublicVideo } from "@/lib/types/video"

// 12500 → "12.5K", 12500000 → "12.5M"
const formatViews = (n: number) =>
  Intl.NumberFormat("en", { notation: "compact" }).format(n)

const VideoCard = ({ video }: { video: PublicVideo }) => {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push(`/watch/${video.id}`)}
      className="group -m-2 block w-full cursor-pointer rounded-xl p-2 text-left transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:scale-[1.02] hover:bg-accent/60 hover:shadow-2xl hover:shadow-background/60 focus-visible:-translate-y-1 focus-visible:scale-[1.02] focus-visible:bg-accent/60"
    >
      {/* Thumbnail — poster-edge ring gives it presence at rest, not just on hover */}
      <div className="relative aspect-video overflow-hidden rounded-lg bg-card ring-1 ring-border/60 transition-shadow duration-(--duration-base) ease-(--ease-out-quart) group-hover:ring-border">
        {video.thumbnail_url ? (
          <Image
            src={storageUrl(video.thumbnail_url)}
            alt={video.title}
            fill
            className="object-cover transition-[filter] duration-(--duration-base) ease-(--ease-out-quart) group-hover:brightness-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-subtle">
            No thumbnail
          </div>
        )}

        {/* Bottom gradient — always present at low strength so the thumbnail
            reads as color-graded key art rather than a flat screenshot;
            deepens on hover for the usual reveal feedback. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-background/45 to-transparent transition-opacity duration-(--duration-base) group-hover:from-background/80" />

        {/* Hover play cue — static glyph, no autoplay preview */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-(--duration-base) group-hover:opacity-100">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background/50 backdrop-blur-sm">
            <Play className="h-4 w-4 fill-foreground text-foreground" />
          </div>
        </div>

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
