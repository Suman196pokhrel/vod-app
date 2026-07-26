"use client"

import React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { usePublicVideos } from '@/hooks/video/use-public-videos'
import { storageUrl } from './player/utils'

interface RelatedVideosProps {
  currentVideoId: string
  category: string
}

const formatViews = (n: number) =>
  Intl.NumberFormat("en", { notation: "compact" }).format(n)

const RelatedVideos = ({ currentVideoId, category }: RelatedVideosProps) => {
  const router = useRouter()
  // Shares its cache entry with the browse page's Hero/Grid (same
  // skip/limit) — navigating browse -> watch within staleTime reuses the
  // already-fetched list instead of firing a new request.
  const { data, isPending } = usePublicVideos(0, 20)

  const videos = data
    ? [...data]
        .filter((v) => v.id !== currentVideoId)
        // Same-category videos first, then everything else.
        .sort((a, b) => Number(b.category === category) - Number(a.category === category))
        .slice(0, 10)
    : []

  return (
    <div className="space-y-3">
      <h2 className="text-xl">Related Videos</h2>
      <div className="space-y-3">
        {isPending &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton aspect-video w-full rounded-lg" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}

        {!isPending && videos.length === 0 && (
          <p className="text-sm text-muted-foreground">No other videos yet.</p>
        )}

        {videos.map((video) => (
          <button
            key={video.id}
            type="button"
            onClick={() => router.push(`/watch/${video.id}`)}
            className="group -m-1.5 block w-full cursor-pointer rounded-lg p-1.5 text-left transition-colors duration-(--duration-fast) ease-(--ease-out-quart) hover:bg-accent/60"
          >
            {/* Thumbnail — full card width */}
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-card">
              {video.thumbnail_url ? (
                <Image
                  src={storageUrl(video.thumbnail_url)}
                  alt={video.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-subtle">
                  No thumbnail
                </div>
              )}
            </div>

            {/* Info — below, not beside */}
            <div className="mt-2 space-y-0.5">
              <h3 className="line-clamp-2 text-sm font-semibold">
                {video.title}
              </h3>
              <p className="eyebrow">
                {video.category} · {formatViews(video.views_count)} views
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default RelatedVideos
