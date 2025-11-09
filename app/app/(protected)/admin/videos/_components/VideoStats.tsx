// app/admin/videos/_components/VideoStats.tsx
import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Video, Eye, Clock, TrendingUp } from 'lucide-react'

const VideoStats = () => {
  const stats = [
    {
      title: 'Total Videos',
      value: '1,284',
      icon: Video,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Total Views',
      value: '2.4M',
      icon: Eye,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Watch Time',
      value: '48.2K hrs',
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'This Month',
      value: '+124',
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{stat.title}</span>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default VideoStats