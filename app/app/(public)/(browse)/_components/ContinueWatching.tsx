// app/home/_components/ContinueWatching.tsx
"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Play, X } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ContinueWatchingItem {
  id: string
  title: string
  thumbnail: string
  progress: number
  timeLeft: string
  episode?: string
}

const ContinueWatching = () => {
  const router = useRouter()

  const continueWatchingItems: ContinueWatchingItem[] = [
    {
      id: "vid_001_stranger_things_s4",
      title: "Stranger Things",
      thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
      progress: 65,
      timeLeft: "45 min left",
      episode: "S4 E3"
    },
    {
      id: "vid_003_breaking_bad_complete",
      title: "Breaking Bad",
      thumbnail: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80",
      progress: 32,
      timeLeft: "1h 20min left",
      episode: "S2 E8"
    },
    {
      id: "vid_005_last_of_us",
      title: "The Last of Us",
      thumbnail: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=800&q=80",
      progress: 88,
      timeLeft: "12 min left",
      episode: "S1 E7"
    }
  ]

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-4">Continue Watching</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {continueWatchingItems.map((item) => (
          <Card
            key={item.id}
            className="group cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden"
            onClick={() => router.push(`/home/watch/${item.id}`)}
          >
            <CardContent className="p-0">
              <div className="relative aspect-video">
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="h-8 w-8 text-black fill-current ml-1" />
                  </div>
                </div>
                {/* Remove Button */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Handle remove
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0">
                  <Progress value={item.progress} className="h-1 rounded-none" />
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-semibold line-clamp-1">{item.title}</h3>
                <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                  <span>{item.episode}</span>
                  <span>{item.timeLeft}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default ContinueWatching