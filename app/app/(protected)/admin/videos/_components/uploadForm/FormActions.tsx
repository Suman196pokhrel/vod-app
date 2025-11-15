// app/admin/videos/_components/uploadForm/FormActions.tsx
"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface FormActionsProps {
  isSubmitting: boolean
  videoFile: File | null
  onSaveDraft: () => void
}

const FormActions = ({ isSubmitting, videoFile, onSaveDraft }: FormActionsProps) => {
  const router = useRouter()

  return (
    <div className="flex items-center justify-end gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => router.push('/admin/videos')}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onSaveDraft}
        disabled={isSubmitting}
      >
        <Save className="h-4 w-4 mr-2" />
        Save Draft
      </Button>
      <Button type="submit" disabled={isSubmitting || !videoFile}>
        <Upload className="h-4 w-4 mr-2" />
        {isSubmitting ? 'Uploading...' : 'Upload Video'}
      </Button>
    </div>
  )
}

export default FormActions