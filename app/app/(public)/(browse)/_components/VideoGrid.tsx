"use client"

import VideoCard, { VideoCardSkeleton } from "./VideoCard"
import { usePublicVideos } from "@/hooks/video/use-public-videos"

// One more column per breakpoint than before — ~20% smaller cards, per
// explicit feedback that the poster tiles were too big.
const GRID_CLASSES =
  "grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"

interface VideoGridProps {
  category: string
}

const VideoGrid = ({ category }: VideoGridProps) => {
  const { data: videos, isPending, isError } = usePublicVideos(0, 20)
  const filtered =
    !videos || category === "all" ? videos : videos.filter((v) => v.category === category)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl">Browse videos</h2>

      {isPending ? (
        <div className={GRID_CLASSES}>
          {Array.from({ length: 12 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <p className="text-muted-foreground">Couldn't load videos. Try refreshing the page.</p>
      ) : !videos || videos.length === 0 ? (
        <p className="text-muted-foreground">No videos yet. Upload one to get started.</p>
      ) : filtered && filtered.length === 0 ? (
        <p className="text-muted-foreground">No videos in this category yet.</p>
      ) : (
        // Keyed on category so switching filters remounts the grid, replaying
        // the CSS entrance animation — plain animate-in/fade-in (no GSAP,
        // no scroll-gating) so cards are never stuck at opacity:0 waiting on
        // a condition that might not fire. See useScrollReveal.ts for why
        // that approach was dropped here.
        <div key={category} className={`${GRID_CLASSES} animate-in fade-in duration-300`}>
          {filtered?.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}

export default VideoGrid
