// app/home/_components/MoodSelector.tsx
"use client"

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

const MoodSelector = () => {
  const router = useRouter()
  const [selectedMood, setSelectedMood] = useState<string>('Happy')

  const moods = [
    { name: 'Happy', emoji: '😊', gradient: 'from-yellow-500/20 to-orange-500/20' },
    { name: 'Excited', emoji: '🤩', gradient: 'from-orange-500/20 to-red-500/20' },
    { name: 'Chill', emoji: '😌', gradient: 'from-green-500/20 to-teal-500/20' },
    { name: 'Thoughtful', emoji: '🤔', gradient: 'from-blue-500/20 to-purple-500/20' },
    { name: 'Romantic', emoji: '💕', gradient: 'from-pink-500/20 to-rose-500/20' },
    { name: 'Adventurous', emoji: '🚀', gradient: 'from-indigo-500/20 to-violet-500/20' },
    { name: 'Scared', emoji: '😱', gradient: 'from-purple-500/20 to-slate-500/20' },
    { name: 'Curious', emoji: '🧐', gradient: 'from-cyan-500/20 to-blue-500/20' }
  ]

  const moodContent: Record<string, Array<{ id: string; title: string; thumbnail: string; category: string }>> = {
    Happy: [
      { id: "vid_016_the_office", title: "The Office", thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80", category: "Comedy" },
      { id: "vid_004_wednesday", title: "Wednesday", thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80", category: "Comedy Mystery" },
      { id: "vid_024_arcane", title: "Arcane", thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80", category: "Animated" }
    ],
    Excited: [
      { id: "vid_008_the_witcher", title: "The Witcher", thumbnail: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&q=80", category: "Fantasy" },
      { id: "vid_010_mandalorian", title: "The Mandalorian", thumbnail: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=400&q=80", category: "Sci-Fi" },
      { id: "vid_013_house_of_dragon", title: "House of the Dragon", thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80", category: "Fantasy Epic" }
    ],
    Chill: [
      { id: "vid_009_planet_earth_iii", title: "Planet Earth III", thumbnail: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80", category: "Documentary" },
      { id: "vid_023_queens_gambit", title: "The Queen's Gambit", thumbnail: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&q=80", category: "Drama" },
      { id: "vid_002_the_crown_final", title: "The Crown", thumbnail: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&q=80", category: "Historical" }
    ],
    Thoughtful: [
      { id: "vid_006_dark", title: "Dark", thumbnail: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400&q=80", category: "Mystery Sci-Fi" },
      { id: "vid_015_black_mirror", title: "Black Mirror", thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80", category: "Anthology" },
      { id: "vid_021_chernobyl", title: "Chernobyl", thumbnail: "https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=400&q=80", category: "Historical" }
    ],
    Romantic: [
      { id: "vid_023_queens_gambit", title: "The Queen's Gambit", thumbnail: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400&q=80", category: "Period Drama" },
      { id: "vid_002_the_crown_final", title: "The Crown", thumbnail: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&q=80", category: "Historical Drama" },
      { id: "vid_004_wednesday", title: "Wednesday", thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80", category: "Mystery" }
    ],
    Adventurous: [
      { id: "vid_005_last_of_us", title: "The Last of Us", thumbnail: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&q=80", category: "Post-Apocalyptic" },
      { id: "vid_010_mandalorian", title: "The Mandalorian", thumbnail: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=400&q=80", category: "Space Western" },
      { id: "vid_008_the_witcher", title: "The Witcher", thumbnail: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&q=80", category: "Fantasy" }
    ],
    Scared: [
      { id: "vid_001_stranger_things_s4", title: "Stranger Things", thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80", category: "Thriller" },
      { id: "vid_022_true_detective", title: "True Detective", thumbnail: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&q=80", category: "Crime Mystery" },
      { id: "vid_006_dark", title: "Dark", thumbnail: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400&q=80", category: "Mystery" }
    ],
    Curious: [
      { id: "vid_009_planet_earth_iii", title: "Planet Earth III", thumbnail: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80", category: "Documentary" },
      { id: "vid_021_chernobyl", title: "Chernobyl", thumbnail: "https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=400&q=80", category: "Historical" },
      { id: "vid_015_black_mirror", title: "Black Mirror", thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80", category: "Sci-Fi" }
    ]
  }

  const currentMoodVideos = moodContent[selectedMood] || []

  return (
    <Card className="mb-8 overflow-hidden">
      <CardContent className="p-0">
        {/* Mood Selector Pills */}
        <div className="p-4 bg-gradient-to-r from-primary/5 to-background border-b">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">What's your mood?</h3>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              {moods.map((mood) => (
                <button
                  key={mood.name}
                  onClick={() => setSelectedMood(mood.name)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full font-medium text-sm transition-all ${
                    selectedMood === mood.name
                      ? `bg-gradient-to-r ${mood.gradient} border-2 border-primary/30 scale-105`
                      : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                  }`}
                >
                  <span className="text-2xl mr-2">{mood.emoji}</span>
                  <span>{mood.name}</span>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Video Recommendations */}
        <div className="p-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-2">
              {currentMoodVideos.map((video) => (
                <div
                  key={video.id}
                  className="flex-shrink-0 w-56 cursor-pointer group"
                  onClick={() => router.push(`/home/watch/${video.id}`)}
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h4 className="font-semibold text-sm line-clamp-1 mb-1">{video.title}</h4>
                  <p className="text-xs text-muted-foreground">{video.category}</p>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

export default MoodSelector