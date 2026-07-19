// app/home/watch/[id]/_components/AIMoodAnalysis.tsx
"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const AIMoodAnalysis = () => {
  const moodData = [
    { emotion: "Suspense", value: 85, color: "bg-purple-500", icon: TrendingUp },
    { emotion: "Drama", value: 72, color: "bg-blue-500", icon: TrendingUp },
    { emotion: "Action", value: 68, color: "bg-red-500", icon: Minus },
    { emotion: "Comedy", value: 45, color: "bg-yellow-500", icon: TrendingDown },
    { emotion: "Romance", value: 30, color: "bg-pink-500", icon: TrendingDown }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Mood Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Content emotional composition analyzed by AI
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {moodData.map((mood, index) => {
          const Icon = mood.icon
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-2">
                  {mood.emotion}
                  <Icon className="h-3 w-3 text-muted-foreground" />
                </span>
                <span className="text-muted-foreground">{mood.value}%</span>
              </div>
              <Progress value={mood.value} className="h-2" />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default AIMoodAnalysis