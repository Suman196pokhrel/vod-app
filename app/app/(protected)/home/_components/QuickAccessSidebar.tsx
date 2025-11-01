// app/home/_components/QuickAccessSidebar.tsx
"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ListOrdered, Clock, X, Brain } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const QuickAccessSidebar = () => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const queueItems = [
    {
      id: "vid_005_last_of_us",
      title: "The Last of Us",
      thumbnail: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&q=80",
      reason: "Continue watching",
      duration: "45 min"
    },
    {
      id: "vid_006_dark",
      title: "Dark",
      thumbnail: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400&q=80",
      reason: "Next in queue",
      duration: "1h 55m"
    },
    {
      id: "vid_013_house_of_dragon",
      title: "House of the Dragon",
      thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80",
      reason: "Recommended",
      duration: "1h 15m"
    }
  ]

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed top-24 right-0 rounded-l-lg rounded-r-none shadow-lg z-40 pr-3 pl-2 h-12"
        variant="default"
      >
        <ListOrdered className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Card className="fixed top-20 right-0 w-80 h-[calc(100vh-6rem)] shadow-2xl z-40 animate-in slide-in-from-right-5 rounded-r-none overflow-auto">
      <CardHeader className="sticky top-0 bg-background z-10 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" />
            Smart Queue
          </CardTitle>
          <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">AI-organized for you</p>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {queueItems.map((item, index) => (
          <div
            key={item.id}
            className="flex gap-2 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            onClick={() => {
              router.push(`/home/watch/${item.id}`)
              setIsOpen(false)
            }}
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{index + 1}</span>
            </div>

            <div className="relative w-20 aspect-video rounded overflow-hidden flex-shrink-0">
              <Image src={item.thumbnail} alt={item.title} fill className="object-cover" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-xs line-clamp-1">{item.title}</h4>
              <p className="text-xs text-muted-foreground">{item.reason}</p>
              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                {item.duration}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default QuickAccessSidebar