# /backend/app/apis/routes/video.py

from fastapi import APIRouter, Depends, status, UploadFile, File, Form, HTTPException
from app.schemas.video import VideoResponse, VideoCreate, VideoList
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.video_service import video_service
from app.core.dependencies import get_current_user  # Your auth dependency
from app.models.users import User  # Your User model
from typing import Optional, List


video_router = APIRouter(
    prefix="/videos",
    tags=["Video"]
)


@video_router.post(
    "/create",
    response_model=VideoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a new video with files"
)
async def create_new_video(
    video: UploadFile = File(..., description="Video file (MP4, MOV, WebM)"),
    thumbnail: Optional[UploadFile] = File(None, description="Thumbnail image (JPEG, PNG)"),
    data: str = Form(..., description="JSON string with video metadata"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a video with metadata.
    
    - **video**: Video file (required)
    - **thumbnail**: Thumbnail image (optional)
    - **data**: JSON string containing title, description, category, etc.
    """
    
    new_video = await video_service.create_video_with_files(
        db=db,
        video_file=video,
        thumbnail_file=thumbnail,
        metadata_json=data,
        user_id=current_user.id
    )
    
    return new_video


@video_router.get(
    "/{video_id}",
    response_model=VideoResponse,
    summary="Get video by ID"
)
def get_video(
    video_id: str,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific video by ID"""
    user_id = current_user.id if current_user else None
    video = video_service.get_video_by_id(db, video_id, user_id)
    return video


@video_router.get(
    "/user/me",
    response_model=List[VideoList],
    summary="Get current user's videos"
)
def get_my_videos(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all videos uploaded by the current user"""
    videos = video_service.get_user_videos(db, current_user.id, skip, limit)
    return videos


@video_router.get(
    "/",
    response_model=List[VideoList],
    summary="Get public videos"
)
def get_public_videos(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get all public videos"""
    videos = video_service.get_public_videos(db, skip, limit)
    return videos


@video_router.delete(
    "/{video_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete video"
)
def delete_video(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a video (owner only)"""
    video_service.delete_video(db, video_id, current_user.id)
    return None


@video_router.post(
    "/{video_id}/view",
    status_code=status.HTTP_200_OK,
    summary="Increment video view count"
)
def increment_video_views(
    video_id: str,
    db: Session = Depends(get_db)
):
    """Increment view count when video is played"""
    video_service.increment_views(db, video_id)
    return {"message": "View count incremented"}