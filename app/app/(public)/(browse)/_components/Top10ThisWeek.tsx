// app/home/_components/Top10ThisWeek.tsx
"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { TrendingUp } from 'lucide-react'

interface Top10Item {
  id: string
  title: string
  thumbnail: string
  rank: number
}

const Top10ThisWeek = () => {
  const router = useRouter()

  const top10Items: Top10Item[] = [
    {
      id: "vid_011_squid_game",
      title: "Squid Game",
      thumbnail: "https://images.unsplash.com/photo-1533094602577-198d3beab8ea?w=400&q=80",
      rank: 1
    },
    {
      id: "vid_001_stranger_things_s4",
      title: "Stranger Things",
      thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80",
      rank: 2
    },
    {
      id: "vid_003_breaking_bad_complete",
      title: "Breaking Bad",
      thumbnail: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&q=80",
      rank: 3
    },
    {
      id: "vid_005_last_of_us",
      title: "The Last of Us",
      thumbnail: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&q=80",
      rank: 4
    },
    {
      id: "vid_010_mandalorian",
      title: "The Mandalorian",
      thumbnail: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=400&q=80",
      rank: 5
    }
  ]

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Top 10 This Week</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {top10Items.map((item) => (
          <Card
            key={item.id}
            className="group cursor-pointer hover:scale-105 transition-transform overflow-hidden"
            onClick={() => router.push(`/home/watch/${item.id}`)}
          >
            <CardContent className="p-0 relative">
              {/* Rank Number */}
              <div className="absolute top-0 left-0 z-10">
                <div className="relative">
                  <span className="text-[120px] font-black leading-none text-white drop-shadow-2xl" style={{
                    WebkitTextStroke: '3px black'
                  }}>
                    {item.rank}
                  </span>
                </div>
              </div>
              {/* Thumbnail */}
              <div className="relative aspect-2/3 mt-8">
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-2 bg-background">
                <p className="text-sm font-semibold line-clamp-1">{item.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default Top10ThisWeek