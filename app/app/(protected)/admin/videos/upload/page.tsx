'use client'
// app/admin/videos/upload/page.tsx
import  { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { formSchema, VideoFormData } from '@/app/(protected)/admin/videos/_components/uploadForm/formSchema'
import UploadForm from '../_components/uploadForm/UploadForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { VideoProcessingDialog } from "@/app/(protected)/admin/videos/_components/multi_step_progress/video-processing-dialog";
import { ApiError, uploadVideo } from '@/lib/apis/video'
import { useVideoProcessing } from '../../../../../hooks/video/use-video-processing'

const UploadVideoPage = () => {

  // Upload Form configs 
  const router = useRouter()
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

  // Video Processing Dialog states 
  const { isOpen, currentStatus, videoId, openDialog, closeDialog } = useVideoProcessing({
    pollingInterval: 3000,
    onComplete: (id) => {
      console.log(" Video processing completed:", id)
      
      // Clear the form
      form.reset()
      setVideoFile(null)
      setThumbnailFile(null)
      setUploadError(null)
      // closeDialog()
      //   router.push('/admin/videos')

     
    },
    onError: (error) => {
      console.log(" Processing error:", error)
      toast.error("Processing failed", {
        description: error.message,
      })
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

    // Clear any previous errors
    setUploadError(null)
    setIsSubmitting(true)

    try {
      const result = await uploadVideo({
        data,
        videoFile,
        thumbnailFile: thumbnailFile
      })

      // Get uploaded Video ID 
      const uploadedVideoId = result.id

      toast.success("Video uploaded successfully!", {
        description: "Processing has started...",
      })
      
      console.log('Upload result:', result)

      openDialog(uploadedVideoId)

    } catch (error) {
      console.error('Upload error:', error)
      
      const apiError = error as ApiError
      const errorMessage = apiError.message || "Failed to upload video. Please try again."
      
      setUploadError(errorMessage)
      toast.error(errorMessage)

      // Log detailed error for debugging
      if (apiError.errors) {
        console.error('Validation errors:', apiError.errors)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    // Clear any previous errors
    setUploadError(null)
    setIsSubmitting(true)
    
    try {
      form.setValue('status', 'draft')
      const values = form.getValues()
      
      // TODO: Implement actual draft saving API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('Saved as draft:', values)
      toast.success("Draft saved successfully!")
    } catch (error) {
      const errorMessage = "Failed to save draft. Please try again."
      setUploadError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }
  
    const handleCloseDialog = () => {
    closeDialog()
    
  }

    const handleRetry = async () => {
    if (!videoId) return

    // try {
    //   // Call your retry API endpoint
    //   const response = await fetch(`/api/videos/${videoId}/retry`, {
    //     method: 'POST',
    //   })

    //   if (!response.ok) {
    //     throw new Error('Retry failed')
    //   }

    //   toast.info("Retrying video processing...")
      
    //   // Reset and reopen dialog
    //   resetProcessing()
    //   openDialog()
      
    // } catch (error) {
    //   console.error('Retry error:', error)
    //   toast.error("Failed to retry processing")
    // }
  }



  return (
    <div className="space-y-6 max-w-5xl">

      <VideoProcessingDialog
        isOpen={isOpen}
        onClose={handleCloseDialog}
        videoId={videoId || undefined}
        currentStatus={currentStatus}
        fileName={videoFile?.name}
        onRetry={handleRetry}
      />


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
    </div>
  )
}

export default UploadVideoPage