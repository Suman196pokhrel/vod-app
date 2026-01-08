import api from "./client";
import { VideoFormData } from "@/app/(protected)/admin/videos/_components/uploadForm/formSchema";
import { AxiosError } from "axios";
import { ProcessingStatus, Video } from "../types/video";
import { VideoPublicationStatus } from "@/lib/types/video";

export interface VideoUploadPayload {
  data: VideoFormData;
  videoFile: File;
  thumbnailFile: File;
}

export interface VideoUploadResponse {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  message: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}

export interface VideoProcessingStatusResponse {
  video_id: string;
  status: ProcessingStatus;
  progress: number;
  message: string;
  error?: string | null;
  is_completed: boolean;
  is_failed: boolean;
}

export interface AdminVideoFilters {
  skip?: number;
  limit?: number;
  status?: VideoPublicationStatus;
  processing_status?: ProcessingStatus;
  search?: string;
  user_id?: string;
  sort_by?: "created_at" | "title" | "views_count" | "updated_at";
  sort_order?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export type AdminVideosResponse = PaginatedResponse<Video>;

/**
 * Upload video with metadata and files
 * Uses FormData for multipart/form-data upload
 */
export const uploadVideo = async ({
  data,
  videoFile,
  thumbnailFile,
}: VideoUploadPayload): Promise<VideoUploadResponse> => {
  try {
    const formData = new FormData();

    // Add files
    formData.append("video", videoFile);
    formData.append("thumbnail", thumbnailFile);

    // Add metadata as JSON string
    formData.append(
      "data",
      JSON.stringify({
        title: data.title,
        description: data.description,
        category: data.category,
        ageRating: data.ageRating,
        director: data.director,
        cast: data.cast,
        releaseDate: data.releaseDate,
        status: data.status,
        tags: data.tags,
      })
    );

    // DEBUG: See what's actually in FormData
    console.log("=== FormData Contents ===");
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(key, ":", value.name, `(${value.size} bytes)`);
      } else {
        console.log(key, ":", value);
      }
    }
    console.log("========================");

    // IMPORTANT: Override Content-Type to let browser set it automatically
    const response = await api.post<VideoUploadResponse>(
      "/videos/create",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  } catch (error) {
    // Handle axios errors
    if (error instanceof AxiosError) {
      const apiError: ApiError = {
        message: "Failed to upload video",
        status: error.response?.status,
      };

      if (error.response?.data) {
        // Backend returned error message
        apiError.message =
          error.response.data.message ||
          error.response.data.detail ||
          "Failed to upload video";
        apiError.errors = error.response.data.errors;
      } else if (error.request) {
        // Request was made but no response
        apiError.message =
          "Network error. Please check your connection and try again.";
      } else {
        // Something else happened
        apiError.message = error.message || "An unexpected error occurred";
      }

      throw apiError;
    }

    // Handle non-axios errors
    throw {
      message: "An unexpected error occurred during upload",
      status: 500,
    } as ApiError;
  }
};

/**
 * Save video as draft (without files)
 */
export const saveDraft = async (data: Partial<VideoFormData>) => {
  const response = await api.post("/videos/draft", data);
  return response.data;
};

/**
 * Get all videos for admin panel with filtering, searching, sorting, and pagination
 *
 * @param filters - Optional filters for videos
 * @returns Paginated list of videos with metadata
 *
 * @example
 * // Get first page
 * const data = await getAdminVideos({ skip: 0, limit: 20 });
 *
 * @example
 * // Search and filter
 * const data = await getAdminVideos({
 *   skip: 0,
 *   limit: 20,
 *   status: 'published',
 *   search: 'tutorial',
 *   sort_by: 'views_count',
 *   sort_order: 'desc'
 * });
 */
export const getAdminVideos = async (
  filters: AdminVideoFilters = {}
): Promise<AdminVideosResponse> => {
  // Destructure with defaults
  const {
    skip = 0,
    limit = 20,
    status,
    processing_status,
    search,
    user_id,
    sort_by = "created_at",
    sort_order = "desc",
  } = filters;

  // Build query params object
  const params: Record<string, string | number> = {
    skip,
    limit,
    sort_by,
    sort_order,
  };

  // Only add optional filters if they exist
  if (status) params.status = status;
  if (processing_status) params.processing_status = processing_status;
  if (search) params.search = search;
  if (user_id) params.user_id = user_id;

  try {
    const response = await api.get<AdminVideosResponse>("/videos/list-all", {
      params,
    });

    return response.data;
  } catch (error: any) {
    // Handle specific error cases
    if (error.response?.status === 403) {
      throw new Error("Admin privileges required");
    }
    if (error.response?.status === 401) {
      throw new Error("Authentication required");
    }

    throw new Error(error.response?.data?.detail || "Failed to fetch videos");
  }
};

// Optional: Helper function for pagination calculation
export const calculatePagination = (response: AdminVideosResponse) => {
  const { total, skip, limit } = response;
  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return {
    currentPage,
    totalPages,
    hasNextPage: response.has_more,
    hasPrevPage: skip > 0,
    startIndex: skip + 1,
    endIndex: Math.min(skip + limit, total),
  };
};

/**
 * Delete video
 */
export const deleteVideo = async (videoId: string) => {
  const response = await api.delete(`/videos/${videoId}`);
  return response.data;
};

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
    );

    console.log("📊 Video status response:", response.data);

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const apiError: ApiError = {
        message: "Failed to fetch video status",
        status: error.response?.status,
      };

      if (error.response?.data) {
        apiError.message =
          error.response.data.detail || "Failed to fetch video status";
      } else if (error.request) {
        apiError.message = "Network error. Please check your connection.";
      } else {
        apiError.message = error.message || "An unexpected error occurred";
      }

      throw apiError;
    }

    throw {
      message: "An unexpected error occurred while fetching status",
      status: 500,
    } as ApiError;
  }
};
