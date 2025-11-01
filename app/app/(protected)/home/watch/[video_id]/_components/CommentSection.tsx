// app/home/watch/[id]/_components/CommentSection.tsx
"use client"

import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface CommentSectionProps {
  videoId: string
}

const mockComments = [
  {
    id: '1',
    author: 'John Doe',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    comment: 'This is absolutely incredible! The cinematography is breathtaking.',
    likes: 234,
    timestamp: '2 hours ago'
  },
  {
    id: '2',
    author: 'Jane Smith',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
    comment: 'Best series I\'ve watched this year. Can\'t wait for the next season!',
    likes: 156,
    timestamp: '5 hours ago'
  },
  {
    id: '3',
    author: 'Mike Johnson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    comment: 'The plot twists are mind-blowing. Highly recommend!',
    likes: 89,
    timestamp: '1 day ago'
  }
]

const CommentSection = ({ videoId }: CommentSectionProps) => {
  const [comment, setComment] = useState('')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Comments ({mockComments.length})</h2>

        {/* Add Comment */}
        <div className="flex gap-3 mb-6">
          <Avatar>
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=You" />
            <AvatarFallback>YO</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={() => setComment('')}>
                Cancel
              </Button>
              <Button size="sm" disabled={!comment.trim()}>
                Comment
              </Button>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {mockComments.map((comm) => (
            <Card key={comm.id}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarImage src={comm.avatar} />
                    <AvatarFallback>{comm.author.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{comm.author}</span>
                      <span className="text-xs text-muted-foreground">{comm.timestamp}</span>
                    </div>
                    <p className="text-sm mb-3">{comm.comment}</p>
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="sm" className="h-8 gap-2">
                        <ThumbsUp className="h-4 w-4" />
                        {comm.likes}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8">
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CommentSection