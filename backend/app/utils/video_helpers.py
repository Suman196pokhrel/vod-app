# app/utils/video_helpers.py (new file)

from app.models.videos import Video
from sqlalchemy.orm import Session
from enum import Enum
from typing import Dict, TypedDict

class ProcessingStatus(str, Enum):
    uploading = "uploading"
    queued = "queued"
    preparing = "preparing"
    transcoding = "transcoding"
    aggregating = "aggregating"
    segmenting = "segmenting"
    creating_manifest = "creating_manifest"
    uploading_to_storage = "uploading_to_storage"
    finalizing = "finalizing"
    completed = "completed"
    failed = "failed"

class StatusMeta(TypedDict):
    progress: int
    message: str


STATUS_META: Dict[ProcessingStatus, StatusMeta] = {
    ProcessingStatus.uploading: {"progress": 5, "message": "Uploading video..."},
    ProcessingStatus.queued: {"progress": 15, "message": "Video queued for processing"},
    ProcessingStatus.preparing: {"progress": 25, "message": "Analyzing video..."},
    ProcessingStatus.transcoding: {"progress": 50, "message": "Creating quality versions..."},
    ProcessingStatus.aggregating: {"progress": 60, "message": "Compiling video outputs..."},
    ProcessingStatus.segmenting: {"progress": 70, "message": "Preparing for streaming..."},
    ProcessingStatus.creating_manifest: {"progress": 80, "message": "Generating playlists..."},
    ProcessingStatus.uploading_to_storage: {"progress": 90, "message": "Saving to storage..."},
    ProcessingStatus.finalizing: {"progress": 95, "message": "Almost done..."},
    ProcessingStatus.completed: {"progress": 100, "message": "Processing complete!"},
    ProcessingStatus.failed: {"progress": 0, "message": "Processing failed"},
}


DEFAULT_META: StatusMeta = {"progress": 0, "message": "Processing..."}





def update_video_processing_status(
    db: Session,
    video_id: str,
    status: str,
    error_message: str = None
):
    """
    Update video processing status in database.
    
    Valid statuses:
    - uploading
    - queued
    - preparing
    - transcoding
    - aggregating
    - segmenting
    - creating_manifest
    - uploading_to_storage
    - finalizing
    - completed
    - failed
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    
    if video:
        video.processing_status = status
        
        if error_message:
            video.processing_error = error_message
        
        db.commit()
        db.refresh(video)
        
    return video