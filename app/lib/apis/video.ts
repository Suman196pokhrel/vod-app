import api from './client'
import { VideoFormData } from '@/app/(protected)/admin/videos/_components/uploadForm/formSchema'
import { AxiosError } from 'axios'
import { ProcessingStatus } from '../types/video'




export interface VideoUploadPayload {
  data: VideoFormData
  videoFile: File
  thumbnailFile: File
}

export interface VideoUploadResponse {
  id: string
  title: string
  videoUrl: string
  thumbnailUrl: string
  message: string
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status?: number
}


export interface VideoProcessingStatusResponse {
  video_id: string
  status: ProcessingStatus
  progress: number
  message: string
  error?: string | null
  is_completed: boolean
  is_failed: boolean
}


/**
 * Upload video with metadata and files
 * Uses FormData for multipart/form-data upload
 */
export const uploadVideo = async ({
  data,
  videoFile,
  thumbnailFile
}: VideoUploadPayload): Promise<VideoUploadResponse> => {
  
  try {
    const formData = new FormData()
    
    // Add files
    formData.append('video', videoFile)
    formData.append('thumbnail', thumbnailFile)
    
    
    // Add metadata as JSON string
    formData.append('data', JSON.stringify({
      title: data.title,
      description: data.description,
      category: data.category,
      ageRating: data.ageRating,
      director: data.director,
      cast: data.cast,
      releaseDate: data.releaseDate,
      status: data.status,
      tags: data.tags
    }))

        // DEBUG: See what's actually in FormData
    console.log('=== FormData Contents ===')
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(key, ':', value.name, `(${value.size} bytes)`)
      } else {
        console.log(key, ':', value)
      }
    }
    console.log('========================')

    // IMPORTANT: Override Content-Type to let browser set it automatically
    const response = await api.post<VideoUploadResponse>('/videos/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return response.data
  } catch (error) {
    // Handle axios errors
    if (error instanceof AxiosError) {
      const apiError: ApiError = {
        message: 'Failed to upload video',
        status: error.response?.status
      }

      if (error.response?.data) {
        // Backend returned error message
        apiError.message = error.response.data.message || error.response.data.detail || 'Failed to upload video'
        apiError.errors = error.response.data.errors
      } else if (error.request) {
        // Request was made but no response
        apiError.message = 'Network error. Please check your connection and try again.'
      } else {
        // Something else happened
        apiError.message = error.message || 'An unexpected error occurred'
      }

      throw apiError
    }

    // Handle non-axios errors
    throw {
      message: 'An unexpected error occurred during upload',
      status: 500
    } as ApiError
  }
}


/**
 * Save video as draft (without files)
 */
export const saveDraft = async (data: Partial<VideoFormData>) => {
  const response = await api.post('/videos/draft', data)
  return response.data
}

/**
 * Get all videos (admin)
 */
export const getVideos = async () => {
  const response = await api.get('/videos')
  return response.data
}

/**
 * Delete video
 */
export const deleteVideo = async (videoId: string) => {
  const response = await api.delete(`/videos/${videoId}`)
  return response.data
}


/**
 * Get the current processing status of a video
 * @param videoId - The ID of the video to check
 * @returns Processing status with progress information
 * @throws ApiError if request fails
 */
export const getVideoStatus = async (
  videoId: string
): Promise<VideoProcessingStatusResponse> => {
  try {
    const response = await api.get<VideoProcessingStatusResponse>(
      `/videos/${videoId}/status`
    )
    
    console.log('📊 Video status response:', response.data)
    
    return response.data
  } catch (error) {
    if (error instanceof AxiosError) {
      const apiError: ApiError = {
        message: 'Failed to fetch video status',
        status: error.response?.status
      }

      if (error.response?.data) {
        apiError.message = error.response.data.detail || 'Failed to fetch video status'
      } else if (error.request) {
        apiError.message = 'Network error. Please check your connection.'
      } else {
        apiError.message = error.message || 'An unexpected error occurred'
      }

      throw apiError
    }

    throw {
      message: 'An unexpected error occurred while fetching status',
      status: 500
    } as ApiError
  }
}
