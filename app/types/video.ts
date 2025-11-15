// types/video.ts

export enum VideoPublicationStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled'
}

// Now your interface becomes:
export interface Video {
  // Core identifiers (from backend)
  id?: string
  userId?: string
  
  // Required fields
  title: string
  description: string
  category: string
  
  // Optional metadata
  duration?: string
  ageRating?: string
  director?: string
  cast?: string
  releaseDate?: string
  tags?: string[]
  
  // Publishing
  status: VideoPublicationStatus
  
  // URLs (set by backend after upload)
  videoUrl?: string
  thumbnailUrl?: string
  
  // Timestamps (from backend)
  createdAt?: string
  updatedAt?: string
  
  // Views
  views?: number
}

// For the upload/create request
export interface VideoCreatePayload {
  title: string
  description: string
  category: string
  duration?: string
  ageRating?: string
  director?: string
  cast?: string
  releaseDate?: string
  tags?: string[]
  status: VideoPublicationStatus
}


