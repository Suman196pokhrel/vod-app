// app/home/_components/HeroSection.tsx
"use client"

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Info, Plus } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import gsap from 'gsap'
import { usePublicVideos } from '@/hooks/video/use-public-videos'
import { useAmbientColor } from '@/lib/motion/useAmbientColor'
import { useStaggeredReveal } from '@/lib/motion/useStaggeredReveal'
import { useRequireAuth } from '@/hooks/use-require-auth'
import { storageUrl } from '@/lib/utils/storage'

const formatViews = (n: number) =>
  Intl.NumberFormat("en", { notation: "compact" }).format(n)

// How many of the most-recent public videos rotate through the hero —
// get_public_videos already orders by created_at desc, so "recent" is the
// featured heuristic until there's a real admin curation feature.
const FEATURED_COUNT = 5
const ROTATE_MS = 8000

const HeroSection = () => {
  const router = useRouter()
  const { requireAuth } = useRequireAuth()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isInWatchlist, setIsInWatchlist] = useState(false)

  // Same skip/limit as VideoGrid's default page — one shared cache entry,
  // one network request, for the whole homepage.
  const { data: videos, isPending, isError } = usePublicVideos(0, 20)
  const featured = (videos ?? []).slice(0, FEATURED_COUNT)
  // Clamped defensively: a background refetch could shrink the list while
  // currentIndex is still pointing at a now out-of-range rotation slot.
  const currentVideo = featured[Math.min(currentIndex, featured.length - 1)]

  const backdropRef = useRef<HTMLDivElement>(null)
  const contentRef = useStaggeredReveal<HTMLDivElement>([currentVideo?.id])
  const { color } = useAmbientColor(
    currentVideo?.thumbnail_url ? storageUrl(currentVideo.thumbnail_url) : null
  )

  useEffect(() => {
    if (featured.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length)
    }, ROTATE_MS)
    return () => clearInterval(interval)
  }, [featured.length])

  // useLayoutEffect (not useEffect) so the fade-from-transparent starting
  // state is applied before the browser paints the new backdrop image —
  // otherwise there'd be a one-frame flash of the new image at full
  // opacity before the tween had a chance to start it at 0.
  useLayoutEffect(() => {
    const el = backdropRef.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.fromTo(
      el,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: "power2.out" }
    )
  }, [currentIndex])

  if (isPending) {
    return (
      <div className="relative h-[84vh] w-full overflow-hidden">
        <div className="skeleton absolute inset-0" />
      </div>
    )
  }

  if (isError || featured.length === 0) {
    return (
      <div className="relative flex h-[50vh] w-full items-center justify-center overflow-hidden bg-background">
        <p className="text-muted-foreground">
          {isError
            ? "Couldn't load videos. Try refreshing the page."
            : "Nothing here yet. Check back soon."}
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-[84vh] w-full overflow-hidden">
      {/* Backdrop — the video's own thumbnail, cross-fading on rotation */}
      <div ref={backdropRef} className="absolute inset-0">
        {currentVideo.thumbnail_url ? (
          <Image
            src={storageUrl(currentVideo.thumbnail_url)}
            alt={currentVideo.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-card" />
        )}

        {/* Ambient tint — the design system's signature element, now
            reaching the hero too: a soft bleed of the content's own color
            behind the vignette, felt more than seen (docs/DESIGN_SYSTEM.md §6). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16] transition-[background] duration-(--duration-cinematic)"
          style={{ background: color ?? "transparent" }}
        />

        {/* Same treatment as the watch detail page's hero: a fixed-width
            fade over the text column, not a full-bleed gradient, so most of
            the artwork stays visible. */}
        <div className="absolute inset-y-0 left-0 w-full bg-linear-to-r from-background via-background/70 to-transparent md:w-2/3" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background to-transparent sm:h-32" />
      </div>

      {/* Content — anchored to the bottom, flush against the left edge,
          same position and info stack as the watch detail page's hero
          (title -> metadata -> primary action -> synopsis -> tags). */}
      <div className="relative flex min-h-[84vh] w-full flex-col justify-end px-4 py-12 sm:px-6 lg:px-8 xl:pl-16">
        <div className="max-w-2xl space-y-5">
          {/* Title/metadata cascade in; the button row does not — it stays
              at full opacity from the first frame so it's never caught
              mid-fade (see watch/[video_id]/page.tsx for the report that
              caught this same pattern hiding a CTA entirely). */}
          <div ref={contentRef} className="space-y-4">
            <h1 className="font-display text-5xl md:text-7xl text-foreground">
              {currentVideo.title}
            </h1>

            <p className="eyebrow flex flex-wrap items-center gap-x-2">
              <span>{currentVideo.category}</span>
              <span aria-hidden>·</span>
              <span>{formatViews(currentVideo.views_count)} views</span>
              <span aria-hidden>·</span>
              <span>{new Date(currentVideo.created_at).getFullYear()}</span>
              {currentVideo.age_rating && (
                <>
                  <span aria-hidden>·</span>
                  <span>{currentVideo.age_rating}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="text-lg px-8"
              onClick={() => router.push(`/play/${currentVideo.id}`)}
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              Play
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 bg-foreground/10 border-foreground/30 text-foreground hover:bg-foreground/20"
              onClick={() => router.push(`/watch/${currentVideo.id}`)}
            >
              <Info className="mr-2 h-5 w-5" />
              More info
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-foreground/10 border-foreground/30 text-foreground hover:bg-foreground/20"
              onClick={() => requireAuth(() => setIsInWatchlist(!isInWatchlist))}
              aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {currentVideo.description && (
            <p className="text-lg text-muted-foreground line-clamp-3 max-w-xl">
              {currentVideo.description}
            </p>
          )}

          {currentVideo.tags && currentVideo.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {currentVideo.tags.slice(0, 5).map((tag, i) => (
                <Badge key={i} variant="outline" className="font-normal">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress indicators */}
      {featured.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {featured.map((video, index) => (
            <button
              key={video.id}
              type="button"
              aria-label={`Show ${video.title}`}
              className={`h-1 transition-all duration-(--duration-base) ease-(--ease-out-quart) rounded-full ${
                index === currentIndex ? 'w-12 bg-foreground' : 'w-6 bg-foreground/50'
              }`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default HeroSection
