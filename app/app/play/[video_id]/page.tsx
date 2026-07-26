"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useVideo } from "@/hooks/video/use-video"
import { usePageFade } from "@/lib/motion/usePageFade"
import VideoPlayer from "@/app/(public)/(browse)/watch/[video_id]/_components/player/VideoPlayer"

// Deliberately outside every route group — (browse)/layout.tsx renders the
// site navbar for everything nested under it, and this page needs none of
// that chrome, matching a dedicated immersive player (back arrow + rating
// only, no nav) rather than the title-detail page at /watch/[video_id].
const PlayPage = ({ params }: { params: Promise<{ video_id: string }> }) => {
  const { video_id } = use(params)
  const { data: video, isError } = useVideo(video_id)
  const pageRef = usePageFade<HTMLDivElement>([video?.id])

  if (isError)
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-watch p-8 text-muted-foreground">
        Video not found. Try going back and selecting another video.
      </div>
    )

  if (!video)
    return (
      <div className="h-screen w-full bg-surface-watch p-4">
        <div className="skeleton h-full w-full" />
      </div>
    )

  return (
    // Fills the whole browser viewport at rest — no letterboxing, no
    // centered aspect-video frame. --media-object-fit: cover (see
    // player.css) makes the <video> itself crop to fill rather than
    // contain-and-bar. The library's own :fullscreen rule always forces
    // "contain" once the user hits the real Fullscreen button, so that
    // path is untouched.
    <div
      ref={pageRef}
      className="relative h-screen w-full overflow-hidden bg-surface-watch"
      style={{ "--media-object-fit": "cover" } as React.CSSProperties}
    >
      {/* Back + rating, overlaid on the player itself — the only chrome
          this page has. */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-3 rounded-full bg-surface-watch/60 px-3 py-1.5 backdrop-blur-sm">
        <Link
          href={`/watch/${video.id}`}
          aria-label="Back to details"
          className="text-foreground transition-colors duration-(--duration-fast) hover:text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {video.age_rating && (
          <span className="eyebrow text-foreground">{video.age_rating}</span>
        )}
      </div>

      <VideoPlayer video={video} className="h-full w-full" />
    </div>
  )
}

export default PlayPage
