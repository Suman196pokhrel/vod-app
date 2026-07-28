# app/services/video/validation.py — video/thumbnail file validation and duration parsing
from fastapi import HTTPException, UploadFile
from typing import Optional

ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"]
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]


def validate_video_file(file: UploadFile) -> None:
    """Validate video file type and size"""
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid video format. Allowed: MP4, MOV, WebM"
        )


def validate_thumbnail_file(file: UploadFile) -> None:
    """Validate thumbnail file type"""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid thumbnail format. Allowed: JPEG, PNG, WebP"
        )


def parse_duration(duration_str: str) -> Optional[int]:
    """Parse duration string like '2h 30m' to total minutes. Returns None if parsing fails."""
    try:
        total_minutes = 0
        duration_str = duration_str.lower().strip()

        if 'h' in duration_str:
            hours_part = duration_str.split('h')[0].strip()
            total_minutes += int(hours_part) * 60
            duration_str = duration_str.split('h')[1].strip()

        if 'm' in duration_str:
            minutes_part = duration_str.split('m')[0].strip()
            if minutes_part:
                total_minutes += int(minutes_part)

        return total_minutes if total_minutes > 0 else None
    except Exception:
        return None
