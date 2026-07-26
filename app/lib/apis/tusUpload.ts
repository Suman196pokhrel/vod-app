import api from "./client"
import { AxiosError } from "axios"
import { ApiError } from "./video"

export interface TusUploadStatus {
  status: string
  video_id: string | null
}

export const getTusUploadStatus = async (uploadId: string): Promise<TusUploadStatus> => {
  try {
    const response = await api.get<TusUploadStatus>(`/internal/tus/hooks/uploads/${uploadId}`)
    return response.data
  } catch (error) {
    if (error instanceof AxiosError) {
      const apiError: ApiError = {
        message: error.response?.data?.detail || "Failed to fetch upload status",
        status: error.response?.status,
      }
      throw apiError
    }
    throw error
  }
}
