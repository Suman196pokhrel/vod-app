// app/home/_components/MoodSelectorCompact.tsx
"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const MoodSelectorCompact = () => {
  const router = useRouter()
  const [selectedMood, setSelectedMood] = useState<string>('Happy')

  const moods = [
    { name: 'Happy', emoji: '😊' },
    { name: 'Excited', emoji: '🤩' },
    { name: 'Chill', emoji: '😌' },
    { name: 'Thoughtful', emoji: '🤔' },
    { name: 'Romantic', emoji: '💕' },
    { name: 'Adventurous', emoji: '🚀' }
  ]

  const moodContent: Record<string, Array<{ id: string; title: string; thumbnail: string }>> = {
    Happy: [
      { id: "vid_016_the_office", title: "The Office", thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80" },
      { id: "vid_004_wednesday", title: "Wednesday", thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80" }
    ],
    Excited: [
      { id: "vid_008_the_witcher", title: "The Witcher", thumbnail: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&q=80" },
      { id: "vid_010_mandalorian", title: "The Mandalorian", thumbnail: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=400&q=80" }
    ],
    Chill: [
      { id: "vid_009_planet_earth_iii", title: "Planet Earth III", thumbnail: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80" },
      { id: "vid_023_queens_gambit", title: "The Queen's Gambit", thumbnail: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&q=80" }
    ],
    Thoughtful: [
      { id: "vid_006_dark", title: "Dark", thumbnail: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400&q=80" },
      { id: "vid_015_black_mirror", title: "Black Mirror", thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80" }
    ],
    Romantic: [
      { id: "vid_023_queens_gambit", title: "The Queen's Gambit", thumbnail: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&q=80" },
      { id: "vid_002_the_crown_final", title: "The Crown", thumbnail: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&q=80" }
    ],
    Adventurous: [
      { id: "vid_005_last_of_us", title: "The Last of Us", thumbnail: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&q=80" },
      { id: "vid_010_mandalorian", title: "The Mandalorian", thumbnail: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=400&q=80" }
    ]
  }

  const currentMoodVideos = moodContent[selectedMood] || []

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Your Mood
        </CardTitle>
        <p className="text-sm text-muted-foreground">Instant recommendations</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mood Grid */}
        <div className="grid grid-cols-3 gap-2">
          {moods.map((mood) => (
            <Button
              key={mood.name}
              variant={selectedMood === mood.name ? "default" : "outline"}
              className="h-auto flex-col gap-1 py-3"
              onClick={() => setSelectedMood(mood.name)}
            >
              <span className="text-2xl">{mood.emoji}</span>
              <span className="text-xs">{mood.name}</span>
            </Button>
          ))}
        </div>

        {/* Recommendations */}
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground">Perfect for you:</p>
          {currentMoodVideos.map((video) => (
            <div
              key={video.id}
              className="flex gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
              onClick={() => router.push(`/home/watch/${video.id}`)}
            >
              <div className="relative w-20 aspect-video rounded overflow-hidden flex-shrink-0">
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm line-clamp-2">{video.title}</h4>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default MoodSelectorCompact