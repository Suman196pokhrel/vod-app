"use client"
// app/home/watch/[id]/page.tsx — title/detail page. Playback itself lives at
// /play/[video_id] (a separate, chrome-free route); this page is the
// HBO-Max-style "movie page" you land on before pressing Watch Now.

import { use } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import VideoInfo from "./_components/VideoInfo"
import RelatedVideos from "./_components/RelatedVideos"
import { useVideo } from "@/hooks/video/use-video"
import { useAmbientColor } from "@/lib/motion/useAmbientColor"
import { usePageFade } from "@/lib/motion/usePageFade"
import { storageUrl } from "./_components/player/utils"

const WatchPage = ({ params }: { params: Promise<{ video_id: string }> }) => {
  const { video_id } = use(params)
  const router = useRouter()
  const { data: video, isError } = useVideo(video_id)
  const { color } = useAmbientColor(
    video?.thumbnail_url ? storageUrl(video.thumbnail_url) : null
  )
  // Whole page fades in together, fast — not a stagger, so nothing (the
  // Watch Now button included) is ever caught half-invisible mid-sequence.
  const pageRef = usePageFade<HTMLDivElement>([video?.id])

  if (isError)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8 text-muted-foreground">
        Video not found. Try going back and selecting another video.
      </div>
    )

  if (!video)
    return (
      <div className="min-h-screen bg-background">
        <div className="relative min-h-[84vh] w-full overflow-hidden">
          <div className="skeleton absolute inset-0" />
        </div>
        <div className="w-full px-4 py-10 sm:px-6 lg:px-8">
          <div className="skeleton h-4 w-full max-w-md" />
        </div>
      </div>
    )

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-background"
      style={{ "--ambient": color ?? "transparent" } as React.CSSProperties}
    >
      {/* Hero — single-video backdrop. The artwork stays the star: gradient
          is concentrated over the left column where text sits (a fixed-width
          fade, not a full-bleed one), leaving most of the image clearly
          visible, matching a real title-detail page rather than a mostly-
          black panel with a sliver of image. */}
      <div className="relative min-h-[84vh] w-full overflow-hidden">
        {video.thumbnail_url ? (
          <Image
            src={storageUrl(video.thumbnail_url)}
            alt={video.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-card" />
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16] transition-[background] duration-(--duration-cinematic)"
          style={{ background: color ?? "transparent" }}
        />

        {/* Text-side fade only spans the left column's width, not the whole
            image — the right two-thirds of the artwork stays fully visible. */}
        <div className="absolute inset-y-0 left-0 w-full bg-linear-to-r from-background via-background/70 to-transparent md:w-2/3" />
        {/* Bottom fade — a shallow strip for a smooth transition into the
            grid below, not a large dark band eating into the artwork. */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background to-transparent sm:h-32" />

        {/* Flush against the left edge (padding only) instead of a centered
            max-w-7xl column, which reads as "offset toward the middle" on a
            wide screen — same fix as the browse-page hero. */}
        <div className="relative flex min-h-[84vh] w-full flex-col justify-end px-4 py-12 sm:px-6 lg:px-8 xl:pl-16">
          <div className="max-w-2xl space-y-5">
            <div className="space-y-4">
              <h1 className="font-display text-4xl text-foreground md:text-5xl">
                {video.title}
              </h1>

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

            <Button
              size="lg"
              className="text-lg px-8"
              onClick={() => router.push(`/play/${video.id}`)}
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              Watch Now
            </Button>

            <VideoInfo video={video} />
          </div>
        </div>
      </div>

      <div className="w-full px-4 pt-4 pb-16 sm:px-6 lg:px-8">
        <RelatedVideos currentVideoId={video.id} category={video.category} />
      </div>
    </div>
  )
}

export default WatchPage
