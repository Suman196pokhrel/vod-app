# app/utils/video_helpers.py (new file)

from app.models.videos import Video
from sqlalchemy.orm import Session

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