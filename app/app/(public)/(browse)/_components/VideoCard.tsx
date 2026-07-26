"use client"

import React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Play } from "lucide-react"
import { storageUrl } from "@/lib/utils/storage"
import { PublicVideo } from "@/lib/types/video"

// Pure poster tile — no title, category, views, or rating on the card
// itself. All of that lives on the detail page now (/watch/[video_id]);
// the grid is just artwork. `alt` still carries the real title for
// accessibility even though nothing is shown visually.
const VideoCard = ({ video }: { video: PublicVideo }) => {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push(`/watch/${video.id}`)}
      aria-label={video.title}
      className="group -m-2 block w-full cursor-pointer p-2 text-left transition-all duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-1 hover:scale-[1.02] hover:bg-accent/60 hover:shadow-2xl hover:shadow-background/60 focus-visible:-translate-y-1 focus-visible:scale-[1.02] focus-visible:bg-accent/60"
    >
      {/* Thumbnail — portrait poster ratio, not the source video's native
          16:9 (a deliberate crop toward a calmer, more premium poster-wall
          look). Sharp corners, no radius. Neutral hover ring, not cyan —
          this section leans neutral. */}
      <div className="relative aspect-[2/3] overflow-hidden bg-card ring-1 ring-border transition-shadow duration-(--duration-base) ease-(--ease-out-quart) group-hover:ring-foreground/40">
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

        {/* Bottom gradient — hover-only. An always-on version was tried and
            reverted: stacked on top of a naturally dark thumbnail (a dim
            room, a night shot) it pushed the card to near-black at rest,
            which is worse than no gradient at all. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-background/80 to-transparent opacity-0 transition-opacity duration-(--duration-base) group-hover:opacity-100" />

        {/* Hover play cue — static glyph, no autoplay preview */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-(--duration-base) group-hover:opacity-100">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background/50 backdrop-blur-sm">
            <Play className="h-4 w-4 fill-foreground text-foreground" />
          </div>
        </div>
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
    <div className="skeleton aspect-[2/3] w-full" style={{ borderRadius: 0 }} />
  </div>
)

export default VideoCard
