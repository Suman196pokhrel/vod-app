# app/services/video/mutations.py - video delete/visibility/metadata/thumbnail writes
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from typing import Optional
from datetime import datetime, timezone
import logging

from app.models.videos import Video
from app.schemas.video import VideoUpdate
from app.services.minio_service import minio_service

from .validation import validate_thumbnail_file

logger = logging.getLogger(__name__)


def delete_video(db: Session, video_id: str, user_id: str, is_admin: bool = False) -> bool:
    """Hard delete video and associated files. Not used by the admin
    table's delete action (that's a soft delete, see soft_delete_video)
    — kept for any process that needs to actually purge a video."""
    video = db.query(Video).filter(Video.id == video_id).first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Owner or admin can delete
    if video.user_id != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this video")

    # Best-effort MinIO cleanup — a missing/already-deleted object must
    # not block removing the DB row, or the video becomes undeletable.
    try:
        minio_service.delete_video(video.raw_video_path)
    except Exception as e:
        logger.warning(f"Failed to delete raw video from MinIO for {video_id}: {e}")

    if video.thumbnail_url:
        try:
            minio_service.delete_thumbnail(video.thumbnail_url)
        except Exception as e:
            logger.warning(f"Failed to delete thumbnail from MinIO for {video_id}: {e}")

    try:
        db.delete(video)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete video: {str(e)}")

    return True


def soft_delete_video(db: Session, video_id: str, user_id: str, is_admin: bool = False) -> bool:
    """Soft delete — marks the video hidden without touching its DB row
    or MinIO files. Actual cleanup is handled by a separate process."""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if video.user_id != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this video")

    video.deleted_at = datetime.now(timezone.utc)
    db.commit()

    return True


def update_video_visibility(db: Session, video_id: str, is_public: bool, user_id: str, is_admin: bool = False) -> Video:
    """Toggle a video between public and private without deleting it."""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if video.user_id != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update this video")

    video.is_public = is_public
    db.commit()
    db.refresh(video)

    return video


def update_video_details(db: Session, video_id: str, payload: VideoUpdate, user_id: str, is_admin: bool = False) -> Video:
    """Apply a partial metadata edit from the admin 'Edit Details' form.
    Only fields actually present in the payload are touched — a field
    left out entirely is left alone, whereas explicitly setting one to
    null/empty does clear it."""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()

    if not video:
        logger.error(f"update_video_details: video not found - {video_id}")
        raise HTTPException(status_code=404, detail="Video not found")

    if video.user_id != user_id and not is_admin:
        logger.error(f"update_video_details: user {user_id} not authorized for video {video_id}")
        raise HTTPException(status_code=403, detail="Not authorized to update this video")

    update_fields = payload.model_dump(exclude_unset=True)

    # A status change should cascade into visibility exactly as it does
    # at creation time (create_video_with_files: is_public = status ==
    # "published"), unless the caller explicitly set is_public in the
    # same payload. Checking payload-key presence alone isn't enough —
    # EditVideoDialog.tsx unconditionally sends the current `status` on
    # every save, even when the admin only touched an unrelated field
    # like title, so "status" in update_fields is true on nearly every
    # request. The check has to be against a real change (comparing to
    # the row's current value), or an unrelated Edit Details save would
    # silently re-derive is_public and undo a privacy decision made
    # separately via the visibility toggle (e.g. a published-but-privated
    # video would flip back to public just from a title edit).
    if (
        "status" in update_fields
        and "is_public" not in update_fields
        and update_fields["status"] != video.status
    ):
        update_fields["is_public"] = update_fields["status"] == "published"

    logger.info(f"update_video_details: updating video {video_id} - fields: {list(update_fields.keys())}")

    for field, value in update_fields.items():
        setattr(video, field, value)

    db.commit()
    db.refresh(video)

    logger.info(f"update_video_details: video {video_id} updated successfully")
    return video


async def upload_video_thumbnail(db: Session, video_id: str, file: UploadFile, user_id: str, is_admin: bool = False) -> Video:
    """Attach/replace a thumbnail on an already-created video — used by
    the resumable (tus) upload flow, where the file arrives after the
    video row already exists (tus's post-finish hook only ever sets
    title/category). Reuses the same validation and MinIO upload path
    as the multipart create flow."""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()

    if not video:
        logger.error(f"upload_video_thumbnail: video not found - {video_id}")
        raise HTTPException(status_code=404, detail="Video not found")

    if video.user_id != user_id and not is_admin:
        logger.error(f"upload_video_thumbnail: user {user_id} not authorized for video {video_id}")
        raise HTTPException(status_code=403, detail="Not authorized to update this video")

    validate_thumbnail_file(file)
    thumbnail_path = await minio_service.upload_thumbnail(file, user_id)

    video.thumbnail_url = thumbnail_path
    db.commit()
    db.refresh(video)

    logger.info(f"upload_video_thumbnail: video {video_id} thumbnail updated")
    return video
