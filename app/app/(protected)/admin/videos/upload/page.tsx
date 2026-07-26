'use client'
// app/admin/videos/upload/page.tsx
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isResumableUploadsEnabled } from '@/lib/utils/featureFlags'
import { LegacyUploadForm } from '../_components/uploadForm/LegacyUploadForm'
import { TusUploadForm } from '../_components/uploadForm/TusUploadForm'

const UploadVideoPage = () => {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/videos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl">Upload Video</h1>
          <p className="text-muted-foreground">
            Add a new video to your library
          </p>
        </div>
      </div>

      {isResumableUploadsEnabled() ? <TusUploadForm /> : <LegacyUploadForm />}
    </div>
  )
}

export default UploadVideoPage
