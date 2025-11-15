// app/admin/videos/_components/VideoUploadZone.tsx
"use client"

import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Video, X, FileVideo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface VideoUploadZoneProps {
  videoFile: File | null
  setVideoFile: (file: File | null) => void
}




const VideoUploadZone = ({ videoFile, setVideoFile }: VideoUploadZoneProps) => {
  const [uploadProgress, setUploadProgress] = React.useState(0)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setVideoFile(acceptedFiles[0])
      // Simulate upload progress
      // let progress = 0
      // const interval = setInterval(() => {
      //   progress += 10
      //   setUploadProgress(progress)
      //   if (progress >= 100) {
      //     clearInterval(interval)
      //   }
      // }, 200)
    }
  }, [setVideoFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 * 1024 // 5GB
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (videoFile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
          <div className="p-3 rounded-lg bg-primary/10">
            <FileVideo className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{videoFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(videoFile.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setVideoFile(null)
              setUploadProgress(0)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* {uploadProgress < 100 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-semibold">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )} */}
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        transition-colors
        ${isDragActive 
          ? 'border-primary bg-primary/5' 
          : 'border-muted-foreground/25 hover:border-primary/50'
        }
      `}
    >
      <input {...getInputProps()} />


      <div className="flex flex-col items-center gap-4">
        <div className="p-4 rounded-full bg-primary/10">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="text-lg font-semibold mb-1">
            {isDragActive ? 'Drop video here' : 'Drag & drop video file'}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse (MP4)
          </p>
        </div>
        <Button type="button" variant="secondary">
          <Video className="h-4 w-4 mr-2" />
          Choose Video File
        </Button>
      </div>
    
    
    </div>
  )
}

export default VideoUploadZone