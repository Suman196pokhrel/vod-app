# app/services/video/download.py - presigned download URL generation for the original source file
from sqlalchemy.orm import Session
from fastapi import HTTPException
import re
import logging

from app.models.videos import Video
from app.services.minio_service import minio_service

logger = logging.getLogger(__name__)


def get_video_download_url(db: Session, video_id: str, user_id: str, public_host: str, public_scheme: str, is_admin: bool = False) -> str:
    """Short-lived presigned URL for downloading the original source
    file, with a filename built from the video's title so the saved
    file isn't just a bare UUID. public_host/public_scheme come from
    the admin's own request (see route) so the presigned signature is
    bound to the host Caddy will actually forward - see the long
    comment on minio_service.get_video_download_url for why."""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if video.user_id != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to download this video")

    extension = video.raw_video_path.rsplit(".", 1)[-1] if "." in video.raw_video_path else "mp4"
    safe_title = re.sub(r"[^\w\-. ]", "_", video.title).strip() or video.id
    filename = f"{safe_title}.{extension}"

    logger.info(f"get_video_download_url: generating download URL for video {video_id} as '{filename}'")
    return minio_service.get_video_download_url(video.raw_video_path, filename, public_host, public_scheme)
