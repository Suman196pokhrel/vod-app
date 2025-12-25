// app/admin/videos/page.tsx
import React from 'react'
import VideoTable from './_components/VideoTable'
import VideoStats from './_components/VideoStats'
import VideoFilters from './_components/VideoFilters'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

const VideosPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      {/* <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Videos</h1>
          <p className="text-muted-foreground">
            Manage your video library
          </p>
        </div>
        <Link href="/admin/videos/upload">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Video
          </Button>
        </Link>
      </div> */}



      {/* Videos Table */}
      <VideoTable />
    </div>
  )
}

export default VideosPage