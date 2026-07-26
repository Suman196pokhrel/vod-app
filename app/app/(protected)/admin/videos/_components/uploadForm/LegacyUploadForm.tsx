'use client'
// app/admin/videos/_components/uploadForm/LegacyUploadForm.tsx
import { useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { formSchema, VideoFormData } from './formSchema'
import UploadForm from './UploadForm'
import { VideoProcessingDialog } from "@/app/(protected)/admin/videos/_components/multi_step_progress/video-processing-dialog"
import { ApiError, uploadVideo } from '@/lib/apis/video'
import { useVideoProcessing } from '@/hooks/video/use-video-processing'

// The original multipart upload flow, preserved behaviorally as-is — this
// is the safety-net fallback rendered when NEXT_PUBLIC_UPLOADS_TUS_ENABLED
// is off. See TusUploadForm for the resumable flow, now the default.
export function LegacyUploadForm() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const form = useForm<VideoFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      ageRating: '',
      director: '',
      cast: '',
      releaseDate: '',
      status: 'draft',
      tags: []
    }
  })

  const { isOpen, currentStatus, videoId, openDialog, closeDialog } = useVideoProcessing({
    pollingInterval: 3000,
    onComplete: () => {
      form.reset()
      setVideoFile(null)
      setThumbnailFile(null)
      setUploadError(null)
    },
    onError: (error) => {
      toast.error("Processing failed", { description: error.message })
    },
  })

  const onSubmit = async (data: VideoFormData) => {
    if (!videoFile) {
      setUploadError("Please select a video file before uploading")
      toast.error("Please select a video file")
      return
    }

    if (!thumbnailFile) {
      setUploadError("Please select a thumbnail file before uploading")
      toast.error("Please select a thumbnail file")
      return
    }

    setUploadError(null)
    setIsSubmitting(true)

    try {
      openDialog()
      const result = await uploadVideo({ data, videoFile, thumbnailFile })
      openDialog(result.id)
    } catch (error) {
      const apiError = error as ApiError
      const errorMessage = apiError.message || "Failed to upload video. Please try again."
      setUploadError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    setUploadError(null)
    setIsSubmitting(true)
    try {
      form.setValue('status', 'draft')
      const values = form.getValues()
      // TODO: Implement actual draft saving API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Saved as draft:', values)
      toast.success("Draft saved successfully!")
    } catch {
      const errorMessage = "Failed to save draft. Please try again."
      setUploadError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <VideoProcessingDialog
        isOpen={isOpen}
        onClose={closeDialog}
        videoId={videoId || undefined}
        currentStatus={currentStatus}
        fileName={videoFile?.name}
      />

      <UploadForm
        form={form}
        onSubmit={onSubmit}
        uploadError={uploadError}
        setUploadError={setUploadError}
        videoFile={videoFile}
        setVideoFile={setVideoFile}
        thumbnailFile={thumbnailFile}
        setThumbnailFile={setThumbnailFile}
        isSubmitting={isSubmitting}
        handleSaveDraft={handleSaveDraft}
      />
    </>
  )
}
