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
  UPLOADING_TO_STORAGE = "uploading_to_storage",
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