// app/admin/videos/_components/VideoTable.tsx
"use client"

import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Edit, Trash, Copy } from 'lucide-react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'

const VideoTable = () => {
  const videos = [
    {
      id: '1',
      title: 'Stranger Things: Season 4',
      thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80',
      category: 'Sci-Fi',
      views: '2.4M',
      duration: '2h 15m',
      uploadDate: '2024-05-15',
      status: 'published'
    },
    {
      id: '2',
      title: 'The Last of Us',
      thumbnail: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&q=80',
      category: 'Drama',
      views: '1.8M',
      duration: '2h 05m',
      uploadDate: '2024-05-10',
      status: 'published'
    },
    {
      id: '3',
      title: 'Breaking Bad: Complete Series',
      thumbnail: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&q=80',
      category: 'Crime',
      views: '3.2M',
      duration: '3h 20m',
      uploadDate: '2024-05-01',
      status: 'published'
    },
    {
      id: '4',
      title: 'The Witcher',
      thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&q=80',
      category: 'Fantasy',
      views: '890K',
      duration: '1h 50m',
      uploadDate: '2024-04-28',
      status: 'draft'
    },
    {
      id: '5',
      title: 'Planet Earth III',
      thumbnail: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80',
      category: 'Documentary',
      views: '1.5M',
      duration: '55m',
      uploadDate: '2024-04-20',
      status: 'published'
    }
  ]

  const statusColors = {
    published: 'bg-green-500/10 text-green-500',
    draft: 'bg-yellow-500/10 text-yellow-500',
    processing: 'bg-blue-500/10 text-blue-500'
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Video</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Upload Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {videos.map((video) => (
            <TableRow key={video.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="relative w-24 aspect-video rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold line-clamp-1">{video.title}</p>
                    <p className="text-xs text-muted-foreground">ID: {video.id}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{video.category}</Badge>
              </TableCell>
              <TableCell>{video.views}</TableCell>
              <TableCell>{video.duration}</TableCell>
              <TableCell>{video.uploadDate}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={statusColors[video.status as keyof typeof statusColors]}
                >
                  {video.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

export default VideoTable