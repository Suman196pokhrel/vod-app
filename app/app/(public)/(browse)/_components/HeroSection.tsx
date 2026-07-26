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
      <div className="relative h-[85vh] w-full overflow-hidden">
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
    <div className="relative h-[85vh] w-full overflow-hidden">
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

        {/* Gradient vignette — edges dissolve into the page background
            rather than cutting off hard. Extra bottom layer makes the
            fade-to-dark reach further than a single overlay would. */}
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-background to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
        <div ref={contentRef} className="max-w-2xl space-y-6">
          <Badge variant="secondary" className="text-sm">
            {currentVideo.category}
          </Badge>

          <h1 className="font-display text-5xl md:text-7xl text-foreground">
            {currentVideo.title}
          </h1>

          <p className="eyebrow flex items-center gap-2 text-sm">
            <span>{formatViews(currentVideo.views_count)} views</span>
            {currentVideo.age_rating && (
              <>
                <span aria-hidden>·</span>
                <Badge variant="outline">{currentVideo.age_rating}</Badge>
              </>
            )}
          </p>

          {currentVideo.description && (
            <p className="text-lg text-muted-foreground line-clamp-3 max-w-xl">
              {currentVideo.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="text-lg px-8"
              onClick={() => router.push(`/watch/${currentVideo.id}`)}
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
