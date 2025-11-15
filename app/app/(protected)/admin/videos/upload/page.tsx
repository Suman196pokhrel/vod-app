// app/admin/videos/upload/page.tsx
import React from 'react'
import UploadForm from '../_components/uploadForm/UploadForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const UploadVideoPage = () => {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/videos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Upload Video</h1>
          <p className="text-muted-foreground">
            Add a new video to your library
          </p>
        </div>
      </div>

      {/* Upload Form */}
      <UploadForm />
    </div>
  )
}

export default UploadVideoPage