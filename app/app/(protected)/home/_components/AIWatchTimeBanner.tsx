// app/home/_components/AIWatchTimeBanner.tsx
"use client"

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const AIWatchTimeBanner = () => {
  const currentHour = new Date().getHours()
  
  const getRecommendation = () => {
    if (currentHour >= 20 && currentHour < 23) {
      return { message: "Perfect time for that thriller you saved!", emoji: "🌙", type: "prime" }
    }
    if (currentHour >= 14 && currentHour < 17) {
      return { message: "Great afternoon for a documentary", emoji: "☕", type: "good" }
    }
    if (currentHour >= 12 && currentHour < 14) {
      return { message: "Quick comedy perfect for lunch break", emoji: "🍽️", type: "casual" }
    }
    return { message: "Save the best for your peak time tonight", emoji: "✨", type: "save" }
  }

  const recommendation = getRecommendation()

  return (
    <Alert className="mb-6 bg-gradient-to-r from-primary/10 to-background border-primary/20">
      <Sparkles className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-sm">
          <span className="mr-2">{recommendation.emoji}</span>
          {recommendation.message}
        </span>
        <Badge variant="secondary" className="ml-2">AI Tip</Badge>
      </AlertDescription>
    </Alert>
  )
}

export default AIWatchTimeBanner