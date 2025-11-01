// app/home/watch/[id]/_components/AISceneTimeline.tsx
"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Sparkles, Zap } from 'lucide-react'
import Image from 'next/image'

interface Scene {
  timestamp: string
  title: string
  thumbnail: string
  type: 'action' | 'drama' | 'comedy' | 'suspense' | 'romance'
}

const AISceneTimeline = () => {
  const [selectedScene, setSelectedScene] = useState<number | null>(null)

  const scenes: Scene[] = [
    {
      timestamp: "0:45",
      title: "Opening Scene",
      thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&q=80",
      type: "suspense"
    },
    {
      timestamp: "5:23",
      title: "First Encounter",
      thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&q=80",
      type: "drama"
    },
    {
      timestamp: "12:15",
      title: "Action Sequence",
      thumbnail: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=200&q=80",
      type: "action"
    },
    {
      timestamp: "18:42",
      title: "Plot Twist",
      thumbnail: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=200&q=80",
      type: "suspense"
    },
    {
      timestamp: "25:10",
      title: "Emotional Moment",
      thumbnail: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=200&q=80",
      type: "drama"
    },
    {
      timestamp: "32:55",
      title: "Comic Relief",
      thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&q=80",
      type: "comedy"
    }
  ]

  const typeColors = {
    action: "bg-red-500/10 text-red-500 border-red-500/20",
    drama: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    comedy: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    suspense: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    romance: "bg-pink-500/10 text-pink-500 border-pink-500/20"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Scene Navigation
          <Badge variant="secondary" className="ml-auto">Beta</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Jump to key moments instantly with AI-detected scenes
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-4">
            {scenes.map((scene, index) => (
              <div
                key={index}
                className={`flex-shrink-0 w-40 cursor-pointer transition-all ${
                  selectedScene === index ? 'scale-105' : 'hover:scale-102'
                }`}
                onClick={() => setSelectedScene(index)}
              >
                <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
                  <Image
                    src={scene.thumbnail}
                    alt={scene.title}
                    fill
                    className="object-cover"
                  />
                  <Badge
                    variant="secondary"
                    className="absolute bottom-1 right-1 text-xs bg-black/70 text-white border-none"
                  >
                    {scene.timestamp}
                  </Badge>
                </div>
                <p className="text-xs font-semibold line-clamp-1">{scene.title}</p>
                <Badge variant="outline" className={`text-xs mt-1 ${typeColors[scene.type]}`}>
                  {scene.type}
                </Badge>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default AISceneTimeline