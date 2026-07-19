"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { getPublicVideos } from '@/lib/apis/video'
import { storageUrl } from './player/utils'
import type { Video } from '@/lib/types/video'

interface RelatedVideosProps {
  currentVideoId: string
  category: string
}

const formatViews = (n: number) =>
  Intl.NumberFormat("en", { notation: "compact" }).format(n)

const RelatedVideos = ({ currentVideoId, category }: RelatedVideosProps) => {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[] | null>(null)

  useEffect(() => {
    getPublicVideos(0, 20)
      .then((all: Video[]) => {
        const others = all.filter((v) => v.id !== currentVideoId)
        // Same-category videos first, then everything else.
        others.sort((a, b) => Number(b.category === category) - Number(a.category === category))
        setVideos(others.slice(0, 10))
      })
      .catch(() => setVideos([]))
  }, [currentVideoId, category])

  return (
    <div className="space-y-4">
      <h2 className="text-xl">Related Videos</h2>
      <div className="space-y-3">
        {videos === null &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton w-40 aspect-video rounded shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            </div>
          ))}

        {videos?.length === 0 && (
          <p className="text-sm text-muted-foreground">No other videos yet.</p>
        )}

        {videos?.map((video) => (
          <Card
            key={video.id}
            className="cursor-pointer hover:bg-accent transition-colors duration-(--duration-fast) ease-(--ease-out-quart)"
            onClick={() => router.push(`/watch/${video.id}`)}
          >
            <CardContent className="p-3">
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="relative w-40 aspect-video rounded overflow-hidden shrink-0 bg-card">
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

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                    {video.title}
                  </h3>
                  <p className="eyebrow">
                    {video.category} · {formatViews(video.views_count)} views
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default RelatedVideos
