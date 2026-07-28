# app/services/video/status.py - processing-status lookups and view-count increments
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.utils.video_helpers import DEFAULT_META, STATUS_META, ProcessingStatus
from app.schemas.video import VideoProcessingStatusResponse
from app.models.videos import Video
from app.models.users import User


def get_video_processing_status_service(
    db: Session,
    video_id: str,
    current_user: User,
) -> VideoProcessingStatusResponse:
    video = db.query(Video).filter(Video.id == video_id).first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # If you prefer "do not leak existence", return 404 instead of 403 here.
    if str(video.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this video")

    # Normalize/validate DB status safely
    try:
        status = ProcessingStatus(str(video.processing_status))
    except ValueError:
        # If DB contains an unexpected string, keep API stable
        # and treat it as a generic “processing” state.
        status = ProcessingStatus.queued

    meta = STATUS_META.get(status, DEFAULT_META)

    is_failed = status == ProcessingStatus.failed
    is_completed = status == ProcessingStatus.completed

    return VideoProcessingStatusResponse(
        video_id=str(video.id),
        status=status,
        progress=meta["progress"],
        message=meta["message"],
        error=str(video.processing_error) if is_failed and video.processing_error else None,
        is_completed=is_completed,
        is_failed=is_failed,
    )


def increment_views(db: Session, video_id: str):
    """Increment video view count"""
    video = db.query(Video).filter(Video.id == video_id).first()
    if video:
        video.views_count += 1
        db.commit()
