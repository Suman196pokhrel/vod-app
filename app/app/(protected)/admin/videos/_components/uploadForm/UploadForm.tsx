// app/admin/videos/_components/uploadForm/UploadForm.tsx
"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useForm } from 'react-hook-form'

import VideoUploadZone from '../VideoUploadZone'
import ThumbnailUploadZone from '../ThumbnailUploadZone'
import BasicInformationSection from './BasicInformationSection'
import AdditionalDetailsSection from './AdditionalDetailsSection'
import PublishingSection from './PublishingSection'
import FormActions from './FormActions'
import UploadError from './UploadError'
import { VideoFormData } from './formSchema'

interface UploadFormProps {
  form: ReturnType<typeof useForm<VideoFormData>>
  onSubmit: (data: VideoFormData)=>void
  uploadError: string | null
  setUploadError: React.Dispatch<React.SetStateAction<string | null>>
  videoFile: File | null
  setVideoFile: React.Dispatch<React.SetStateAction<File | null>>
  thumbnailFile: File | null
  setThumbnailFile: React.Dispatch<React.SetStateAction<File | null>>
  isSubmitting: boolean
  handleSaveDraft: () => Promise<void>
}


const UploadForm = ({
  form, 
  onSubmit, 
  uploadError, 
  setUploadError, 
  videoFile, 
  setVideoFile, 
  thumbnailFile, 
  setThumbnailFile, 
  isSubmitting, 
  handleSaveDraft
}:UploadFormProps) => {


  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Error Alert */}
      <UploadError error={uploadError} onDismiss={() => setUploadError(null)} />

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