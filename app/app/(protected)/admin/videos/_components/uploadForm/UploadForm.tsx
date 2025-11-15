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
import { formSchema, VideoFormData } from './formSchema'

const UploadForm = () => {
  const router = useRouter()
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<VideoFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      duration: '',
      ageRating: '',
      director: '',
      cast: '',
      releaseDate: '',
      status: 'draft',
      tags: []
    }
  })

  const onSubmit = async (data: VideoFormData) => {
    setIsSubmitting(true)

    try {
      // Mock upload delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      console.log('Upload Payload:', {
        ...data,
        videoFile,
        thumbnailFile
      })

      toast.success("Video uploaded successfully!")
      router.push('/admin/videos')
    } catch (error) {
      toast.error("Failed to upload video")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    setIsSubmitting(true)
    
    try {
      form.setValue('status', 'draft')
      const values = form.getValues()
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('Saved as draft:', values)
      toast.success("Draft saved successfully!")
    } catch (error) {
      toast.error("Failed to save draft")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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