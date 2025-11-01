// app/home/_components/ContentJourney.tsx
"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Brain, Laugh, Zap, Heart, Globe } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

const ContentJourney = () => {
  const categories = [
    { 
      name: 'Educational', 
      icon: Brain, 
      hours: 12, 
      total: 20, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      shows: ['Planet Earth III', 'Chernobyl']
    },
    { 
      name: 'Thrillers', 
      icon: Zap, 
      hours: 18, 
      total: 20, 
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      shows: ['Dark', 'True Detective']
    },
    { 
      name: 'Comedy', 
      icon: Laugh, 
      hours: 8, 
      total: 20, 
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      shows: ['The Office', 'Wednesday']
    },
    { 
      name: 'International', 
      icon: Globe, 
      hours: 5, 
      total: 20, 
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      shows: ['Squid Game', 'Narcos']
    }
  ]

  const totalHours = categories.reduce((acc, cat) => acc + cat.hours, 0)

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          Your Content Journey
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Exploring diverse content - {totalHours} hours this month
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category, index) => {
          const Icon = category.icon
          const percentage = (category.hours / category.total) * 100
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${category.bgColor}`}>
                    <Icon className={`h-4 w-4 ${category.color}`} />
                  </div>
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{category.hours}h</span>
              </div>
              <Progress value={percentage} className="h-1.5" />
              <div className="flex gap-1 flex-wrap">
                {category.shows.map((show, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {show}
                  </Badge>
                ))}
              </div>
            </div>
          )
        })}

        <div className="pt-3 border-t text-center">
          <p className="text-xs text-muted-foreground">
            🎯 You've explored <span className="font-semibold text-foreground">{categories.length} different genres</span> this month!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default ContentJourney