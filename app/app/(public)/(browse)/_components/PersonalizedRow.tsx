// app/home/_components/PersonalizedRow.tsx
"use client"

import React from 'react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface PersonalizedRowProps {
  title: string
  subtitle?: string
  videos: Array<{
    id: string
    title: string
    thumbnail: string
  }>
}

const PersonalizedRow = ({ title, subtitle, videos }: PersonalizedRowProps) => {
  const router = useRouter()

  return (
    <div className="mb-12">
      <div className="flex items-start gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{title}</h2>
            {subtitle && <Sparkles className="h-5 w-5 text-primary" />}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {videos.map((video) => (
            <Card
              key={video.id}
              className="shrink-0 w-64 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
              onClick={() => router.push(`/home/watch/${video.id}`)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-video">
                  <Image
                    src={video.thumbnail}
                    alt={video.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-1">{video.title}</h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

export default PersonalizedRow