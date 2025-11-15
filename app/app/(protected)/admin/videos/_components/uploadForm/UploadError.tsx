// app/admin/videos/_components/uploadForm/UploadError.tsx
"use client"

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UploadErrorProps {
  error: string | null
  onDismiss: () => void
}

const UploadError = ({ error, onDismiss }: UploadErrorProps) => {
  if (!error) return null

  return (
    <Alert variant="destructive" className="relative">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Upload Failed</AlertTitle>
      <AlertDescription className="mt-2">
        {error}
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  )
}

export default UploadError