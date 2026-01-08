// types/video.ts

export enum VideoPublicationStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled'
}
export interface VideoFFmpegMetadata {
  duration_seconds: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  frame_rate: number;
  file_size: number;
  audio_codec: string | null;
  audio_bitrate: number | null;
}


// Video Response Type from Backend API for Admin Video table 
export interface Video {
  id: string;
  celery_task_id: string | null;
  title: string;
  description: string | null;
  category: string;
  raw_video_path: string;
  thumbnail_url: string | null;
  age_rating: string;
  release_date: string | null;
  director: string | null;
  cast: string[] | null;
  tags: string[] | null;
  views_count: number;
  likes_count: number;
  is_public: boolean;
  status: VideoPublicationStatus;
  processing_status: ProcessingStatus;
  processing_metadata: VideoFFmpegMetadata | null;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
  manifest_url: string | null;
  available_qualities: string[];
  user_id: string;
}

// For the upload/create request
export interface VideoCreatePayload {
  title: string
  description: string
  category: string
  // duration?: string
  ageRating?: string
  director?: string
  cast?: string
  releaseDate?: string
  tags?: string[]
  status: VideoPublicationStatus
}


// types/video-processing.ts

export enum ProcessingStatus {
  UPLOADING = "uploading",
  QUEUED = "queued",
  PREPARING = "preparing",
  TRANSCODING = "transcoding",
  AGGREGATING = "aggregating",
  SEGMENTING = "segmenting",
  CREATING_MANIFEST = "creating_manifest",
  UPLOADING_TO_STORAGE = "uploading to storage",
  FINALIZING = "finalizing",
  COMPLETED = "completed",
  FAILED = "failed",
}

// Defines the shape of metadata for each status 
export interface StatusMeta {
  progress: number;
  message: string;
}

// Defines what a "visual phase" looks like, ensures type saftey
export interface ProcessingPhase {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  statuses: ProcessingStatus[];
}


// Defines the contract for the main dialog component's props
export interface VideoProcessingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: ProcessingStatus;
  videoId?: string;
  fileName?: string;
  onRetry?: () => void;
}


// Defines props for individual phase component  
export interface PhaseItemProps {
  phase: ProcessingPhase;
  isActive: boolean;
  isComplete: boolean;
  index: number;
}





