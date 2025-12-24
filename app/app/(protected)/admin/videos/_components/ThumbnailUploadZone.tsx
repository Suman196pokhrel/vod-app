// app/admin/videos/_components/ThumbnailUploadZone.tsx
"use client"

import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Image as ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface ThumbnailUploadZoneProps {
  thumbnailFile: File | null
  setThumbnailFile: (file: File | null) => void
}

const ThumbnailUploadZone = ({ thumbnailFile, setThumbnailFile }: ThumbnailUploadZoneProps) => {
  const [preview, setPreview] = React.useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setThumbnailFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [setThumbnailFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  const handleRemove = () => {
    setThumbnailFile(null)
    setPreview(null)
  }

  if (preview && thumbnailFile) {
    return (
      <div className="relative aspect-video rounded-lg overflow-hidden border">
        <Image
          src={preview}
          alt="Thumbnail preview"
          fill
          className="object-cover"
        />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2"
          onClick={handleRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors aspect-video flex items-center justify-center
        ${isDragActive 
          ? 'border-primary bg-primary/5' 
          : 'border-muted-foreground/25 hover:border-primary/50'
        }
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <ImageIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold mb-1">
            {isDragActive ? 'Drop thumbnail here' : 'Upload thumbnail'}
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WEBP (16:9 ratio recommended)
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Choose Image
        </Button>
      </div>
    </div>
  )
}

export default ThumbnailUploadZone