// app/(admin)/admin/dashboard/_components/StatsCards.tsx
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, Users, Eye, TrendingUp } from 'lucide-react'

const StatsCards = () => {
  const stats = [
    {
      title: 'Total Videos',
      value: '1,284',
      change: '+12.5%',
      icon: Video,
    },
    {
      title: 'Total Users',
      value: '24,832',
      change: '+8.2%',
      icon: Users,
    },
    {
      title: 'Total Views',
      value: '2.4M',
      change: '+23.1%',
      icon: Eye,
    },
    {
      title: 'Revenue',
      value: '$48,293',
      change: '+15.3%',
      icon: TrendingUp,
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="p-2 rounded-lg bg-accent">
                <Icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-primary font-medium">{stat.change}</span> from last month
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default StatsCards