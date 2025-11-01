// app/(admin)/admin/dashboard/_components/UserGrowthChart.tsx
"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

const UserGrowthChart = () => {
  const data = [
    { month: 'Jan', users: 4000 },
    { month: 'Feb', users: 5200 },
    { month: 'Mar', users: 6800 },
    { month: 'Apr', users: 8100 },
    { month: 'May', users: 10400 },
    { month: 'Jun', users: 12800 }
  ]

  const maxUsers = Math.max(...data.map(d => d.users))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          User Growth
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.month} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.month}</span>
                <span className="font-semibold">{item.users.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(item.users / maxUsers) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default UserGrowthChart