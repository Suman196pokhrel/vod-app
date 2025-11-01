// app/home/_components/SmartQueue.tsx
"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ListOrdered, Clock, Brain, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const SmartQueue = () => {
  const router = useRouter()

  const queueItems = [
    {
      id: "vid_005_last_of_us",
      title: "The Last of Us",
      thumbnail: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&q=80",
      reason: "Finishing what you started",
      aiScore: 98,
      duration: "45 min"
    },
    {
      id: "vid_006_dark",
      title: "Dark",
      thumbnail: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400&q=80",
      reason: "Matches your current mood",
      aiScore: 94,
      duration: "1h 55m"
    },
    {
      id: "vid_013_house_of_dragon",
      title: "House of the Dragon",
      thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80",
      reason: "Perfect for evening viewing",
      aiScore: 89,
      duration: "1h 15m"
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          AI Smart Queue
          <Badge variant="secondary" className="ml-auto">Auto-sorted</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">Intelligently ordered based on your preferences</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {queueItems.map((item, index) => (
          <div
            key={item.id}
            className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
            onClick={() => router.push(`/home/watch/${item.id}`)}
          >
            {/* Position Number */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{index + 1}</span>
            </div>

            {/* Thumbnail */}
            <div className="relative w-24 aspect-video rounded overflow-hidden flex-shrink-0">
              <Image
                src={item.thumbnail}
                alt={item.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm line-clamp-1">{item.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs bg-primary/5">
                  {item.aiScore}% Match
                </Badge>
                <span className="text-xs text-muted-foreground">{item.duration}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                💡 {item.reason}
              </p>
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full mt-2">
          <ListOrdered className="h-4 w-4 mr-2" />
          Manage Queue
        </Button>
      </CardContent>
    </Card>
  )
}

export default SmartQueue