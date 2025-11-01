// app/admin/videos/_components/UploadForm.tsx
"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from '@/components/ui/badge'
import { X, Upload, Save } from 'lucide-react'
import VideoUploadZone from './VideoUploadZone'
import ThumbnailUploadZone from './ThumbnailUploadZone'
import { useRouter } from 'next/navigation'

const UploadForm = () => {
  const router = useRouter()
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    duration: '',
    ageRating: '',
    director: '',
    cast: '',
    releaseDate: '',
    status: 'draft'
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Mock upload delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('Form Data:', {
      ...formData,
      tags,
      videoFile,
      thumbnailFile
    })

    // Success - redirect back to videos list
    router.push('/admin/videos')
  }

  const handleSaveDraft = async () => {
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Saved as draft')
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter video title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Enter video description"
              rows={5}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              required
            />
          </div>

          {/* Category & Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="action">Action</SelectItem>
                  <SelectItem value="drama">Drama</SelectItem>
                  <SelectItem value="comedy">Comedy</SelectItem>
                  <SelectItem value="scifi">Sci-Fi</SelectItem>
                  <SelectItem value="thriller">Thriller</SelectItem>
                  <SelectItem value="documentary">Documentary</SelectItem>
                  <SelectItem value="fantasy">Fantasy</SelectItem>
                  <SelectItem value="horror">Horror</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (e.g., 2h 15m)</Label>
              <Input
                id="duration"
                placeholder="1h 30m"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
              />
            </div>
          </div>

          {/* Age Rating & Release Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ageRating">Age Rating</Label>
              <Select
                value={formData.ageRating}
                onValueChange={(value) => handleInputChange('ageRating', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="G">G - General Audiences</SelectItem>
                  <SelectItem value="PG">PG - Parental Guidance</SelectItem>
                  <SelectItem value="PG-13">PG-13</SelectItem>
                  <SelectItem value="R">R - Restricted</SelectItem>
                  <SelectItem value="TV-14">TV-14</SelectItem>
                  <SelectItem value="TV-MA">TV-MA - Mature</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="releaseDate">Release Date</Label>
              <Input
                id="releaseDate"
                type="date"
                value={formData.releaseDate}
                onChange={(e) => handleInputChange('releaseDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Director */}
          <div className="space-y-2">
            <Label htmlFor="director">Director / Creator</Label>
            <Input
              id="director"
              placeholder="Enter director name"
              value={formData.director}
              onChange={(e) => handleInputChange('director', e.target.value)}
            />
          </div>

          {/* Cast */}
          <div className="space-y-2">
            <Label htmlFor="cast">Cast (comma-separated)</Label>
            <Input
              id="cast"
              placeholder="Actor 1, Actor 2, Actor 3"
              value={formData.cast}
              onChange={(e) => handleInputChange('cast', e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add a tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
              />
              <Button type="button" onClick={handleAddTag} variant="secondary">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Publishing Options */}
      <Card>
        <CardHeader>
          <CardTitle>Publishing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft - Save for later</SelectItem>
                <SelectItem value="published">Published - Go live immediately</SelectItem>
                <SelectItem value="scheduled">Scheduled - Set publish date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
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
          onClick={handleSaveDraft}
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
    </form>
  )
}

export default UploadForm