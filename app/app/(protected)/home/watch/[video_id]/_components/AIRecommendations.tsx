// app/home/watch/[id]/_components/AIRecommendations.tsx
"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Lightbulb, Play } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface AIRecommendation {
  id: string
  title: string
  thumbnail: string
  reason: string
  matchScore: number
  tags: string[]
}

const AIRecommendations = () => {
  const router = useRouter()

  const recommendations: AIRecommendation[] = [
    {
      id: "vid_006_dark",
      title: "Dark",
      thumbnail: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400&q=80",
      reason: "Similar mind-bending plot and supernatural elements",
      matchScore: 94,
      tags: ["Time Travel", "Mystery", "Complex Plot"]
    },
    {
      id: "vid_005_last_of_us",
      title: "The Last of Us",
      thumbnail: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&q=80",
      reason: "You enjoyed survival themes and character-driven narratives",
      matchScore: 89,
      tags: ["Post-Apocalyptic", "Drama", "Strong Characters"]
    },
    {
      id: "vid_015_black_mirror",
      title: "Black Mirror",
      thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80",
      reason: "Based on your interest in thought-provoking sci-fi",
      matchScore: 87,
      tags: ["Anthology", "Dystopian", "Technology"]
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          AI Personalized For You
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Based on your viewing history and preferences
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="group relative rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => router.push(`/home/watch/${rec.id}`)}
          >
            <div className="flex gap-3">
              {/* Thumbnail */}
              <div className="relative w-32 aspect-video rounded overflow-hidden flex-shrink-0">
                <Image
                  src={rec.thumbnail}
                  alt={rec.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-sm">{rec.title}</h4>
                  <Badge variant="secondary" className="flex-shrink-0">
                    {rec.matchScore}% Match
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {rec.reason}
                </p>

                <div className="flex flex-wrap gap-1">
                  {rec.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default AIRecommendations