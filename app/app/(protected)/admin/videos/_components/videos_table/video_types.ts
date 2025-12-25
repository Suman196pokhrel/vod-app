// Types matching your PostgreSQL Video model

export type VideoStatus = 'draft' | 'published' | 'archived';

export type ProcessingStatus = 
  | 'queued' 
  | 'preparing' 
  | 'transcoding' 
  | 'segmenting' 
  | 'creating_manifest' 
  | 'uploading to storage' 
  | 'finalizing' 
  | 'completed' 
  | 'failed';

export interface VideoMetadata {
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
  status: VideoStatus;
  processing_status: ProcessingStatus;
  processing_metadata: VideoMetadata | null;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
  manifest_url: string | null;
  available_qualities: string[];
  user_id: string;
}