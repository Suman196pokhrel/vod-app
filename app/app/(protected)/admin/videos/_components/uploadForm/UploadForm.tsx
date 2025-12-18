// app/admin/videos/_components/uploadForm/UploadForm.tsx
"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import VideoUploadZone from '../VideoUploadZone'
import ThumbnailUploadZone from '../ThumbnailUploadZone'
import BasicInformationSection from './BasicInformationSection'
import AdditionalDetailsSection from './AdditionalDetailsSection'
import PublishingSection from './PublishingSection'
import FormActions from './FormActions'
import UploadError from './UploadError'
import { formSchema, VideoFormData } from './formSchema'
import { uploadVideo, ApiError } from '@/lib/apis/video'

const UploadForm = () => {
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
      // duration: '',
      ageRating: '',
      director: '',
      cast: '',
      releaseDate: '',
      status: 'draft',
      tags: []
    }
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

      toast.success("Video uploaded successfully!")
      console.log('Upload result:', result)
      router.push('/admin/videos')
      
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

  const handleDismissError = () => {
    setUploadError(null)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Error Alert */}
      <UploadError error={uploadError} onDismiss={handleDismissError} />

      {/* Video Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Video File</CardTitle>
        </CardHeader>
        <CardContent>
          <VideoUploadZone 
            videoFile={videoFile} 
            setVideoFile={setVideoFile} 
          />
        </CardContent>
      </Card>

      {/* Thumbnail Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Thumbnail</CardTitle>
        </CardHeader>
        <CardContent>
          <ThumbnailUploadZone 
            thumbnailFile={thumbnailFile} 
            setThumbnailFile={setThumbnailFile} 
          />
        </CardContent>
      </Card>

      {/* Basic Information */}
      <BasicInformationSection form={form} />

      {/* Additional Details */}
      <AdditionalDetailsSection form={form} />

      {/* Publishing Options */}
      <PublishingSection form={form} />

      {/* Action Buttons */}
      <FormActions 
        isSubmitting={isSubmitting}
        videoFile={videoFile}
        onSaveDraft={handleSaveDraft}
      />
    </form>
  )
}

export default UploadForm