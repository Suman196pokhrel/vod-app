// app/(admin)/admin/dashboard/_components/RecentActivity.tsx
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Activity } from 'lucide-react'

const RecentActivity = () => {
  const activities = [
    {
      id: '1',
      user: 'John Doe',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
      action: 'uploaded a new video',
      target: 'Breaking Bad: Final Season',
      time: '2 minutes ago',
      type: 'upload'
    },
    {
      id: '2',
      user: 'Sarah Smith',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      action: 'created a new account',
      target: null,
      time: '15 minutes ago',
      type: 'user'
    },
    {
      id: '3',
      user: 'Mike Johnson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
      action: 'commented on',
      target: 'Stranger Things',
      time: '1 hour ago',
      type: 'comment'
    },
    {
      id: '4',
      user: 'Emma Wilson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
      action: 'subscribed to Premium',
      target: null,
      time: '3 hours ago',
      type: 'subscription'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={activity.avatar} />
                <AvatarFallback>{activity.user.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold">{activity.user}</span>
                  {' '}{activity.action}
                  {activity.target && (
                    <span className="font-semibold"> {activity.target}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activity.time}
                </p>
              </div>
              <Badge variant="secondary" className="bg-accent text-primary border-0">
                {activity.type}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default RecentActivity