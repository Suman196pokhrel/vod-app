// app/home/watch/[id]/_components/AIWatchParty.tsx
"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Clock, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const AIWatchParty = () => {
  const suggestedFriends = [
    {
      name: "Sarah M.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      reason: "Watched similar content 3 times",
      compatibility: 92
    },
    {
      name: "Alex K.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      reason: "Active during your watch times",
      compatibility: 87
    },
    {
      name: "Mike R.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
      reason: "Similar taste in sci-fi",
      compatibility: 85
    }
  ]

  const peakTimes = ["8:00 PM", "9:30 PM", "10:15 PM"]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          AI Watch Party Suggestions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Watch together with friends who'd love this
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Suggested Friends */}
        <div className="space-y-3">
          {suggestedFriends.map((friend, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={friend.avatar} />
                <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{friend.name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {friend.compatibility}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{friend.reason}</p>
              </div>
              <Button size="sm" variant="outline">
                Invite
              </Button>
            </div>
          ))}
        </div>

        {/* Peak Watch Times */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Best Times to Watch</p>
            <Sparkles className="h-3 w-3 text-primary" />
          </div>
          <div className="flex flex-wrap gap-2">
            {peakTimes.map((time, index) => (
              <Badge key={index} variant="outline" className="cursor-pointer hover:bg-muted">
                {time}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            When most of your friends are online
          </p>
        </div>

        <Button className="w-full" variant="default">
          <Users className="h-4 w-4 mr-2" />
          Create Watch Party
        </Button>
      </CardContent>
    </Card>
  )
}

export default AIWatchParty