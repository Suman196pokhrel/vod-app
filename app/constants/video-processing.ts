// constants/video-processing.ts

import { 
  Upload,           // Phase 1
  CloudUpload,      // Phase 2  
  ScanEye,          // Phase 3
  Clapperboard,     // Phase 4
  Grid3x3,          // Phase 5
  Package,          // Phase 6
  Sparkles,         // Phase 7
} from "lucide-react";

import { ProcessingStatus, StatusMeta, ProcessingPhase } from "@/lib/types/video";

export const STATUS_META: Record<ProcessingStatus, StatusMeta> = {
  [ProcessingStatus.UPLOADING]: { 
    progress: 5, 
    message: "Uploading video..." 
  },
  [ProcessingStatus.QUEUED]: { 
    progress: 15, 
    message: "Video queued for processing" 
  },
  [ProcessingStatus.PREPARING]: { 
    progress: 25, 
    message: "Analyzing video..." 
  },
  [ProcessingStatus.TRANSCODING]: { 
    progress: 50, 
    message: "Creating quality versions..." 
  },
  [ProcessingStatus.AGGREGATING]: { 
    progress: 60, 
    message: "Compiling video outputs..." 
  },
  [ProcessingStatus.SEGMENTING]: { 
    progress: 70, 
    message: "Preparing for streaming..." 
  },
  [ProcessingStatus.CREATING_MANIFEST]: { 
    progress: 80, 
    message: "Generating playlists..." 
  },
  [ProcessingStatus.UPLOADING_TO_STORAGE]: { 
    progress: 90, 
    message: "Saving to storage..." 
  },
  [ProcessingStatus.FINALIZING]: { 
    progress: 95, 
    message: "Almost done..." 
  },
  [ProcessingStatus.COMPLETED]: { 
    progress: 100, 
    message: "Processing complete!" 
  },
  [ProcessingStatus.FAILED]: { 
    progress: 0, 
    message: "Processing failed" 
  },
};

export const PROCESSING_PHASES: ProcessingPhase[] = [
  {
    id: "upload",
    label: "Upload",           
    icon: Upload,
    statuses: [ProcessingStatus.UPLOADING],
  },
  {
    id: "queue",
    label: "Queue",            
    icon: CloudUpload,
    statuses: [ProcessingStatus.QUEUED],
  },
  {
    id: "analyze",
    label: "Analyze",          
    icon: ScanEye,
    statuses: [ProcessingStatus.PREPARING],
  },
  {
    id: "transcode",
    label: "Transcode",       
    icon: Clapperboard,
    statuses: [ProcessingStatus.TRANSCODING],
  },
  {
    id: "segment",
    label: "Segment",          
    icon: Grid3x3,
    statuses: [
      ProcessingStatus.AGGREGATING,
      ProcessingStatus.SEGMENTING,
    ],
  },
  {
    id: "package",
    label: "Package",          
    icon: Package,
    statuses: [ProcessingStatus.CREATING_MANIFEST],
  },
  {
    id: "deploy",
    label: "Deploy",           
    icon: Sparkles,
    statuses: [
      ProcessingStatus.UPLOADING_TO_STORAGE,
      ProcessingStatus.FINALIZING,
    ],
  },
];

export const DEFAULT_META: StatusMeta = {
  progress: 0,
  message: "Processing...",
};