# /backend/app/apis/routes/video.py

from fastapi import APIRouter, Depends, status, UploadFile, File, Form, HTTPException, Query, Request
from app.schemas.video import VideoResponse, VideoCreate, VideoList
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.video_service import video_service
from app.core.dependencies import get_current_user , get_current_admin_user, get_current_user_optional
from app.models.users import User  
from typing import Optional, List
from app.schemas.video import VideoProcessingStatusResponse,PaginatedResponse, AdminVideoList, VideoVisibilityUpdate, VideoUpdate



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
    current_user: User = Depends(get_current_admin_user),
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
    "/by-id/{video_id}",
    response_model=VideoResponse,
    summary="Get video by ID"
)
def get_video(
    video_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get a specific video by ID. Public videos are visible to anyone;
    private videos are visible only to their owner or an admin — any other
    caller gets a 404 (not 403) so private video existence isn't leaked."""
    user_id = current_user.id if current_user else None
    is_admin = current_user.is_admin() if current_user else False
    video = video_service.get_video_by_id(db, video_id, user_id, is_admin)
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
    "/by-id/{video_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete video"
)
def delete_video(
    video_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Soft delete a video — hides it everywhere without touching its row
    or files. Permanent cleanup is handled by a separate process."""
    video_service.soft_delete_video(db, video_id, current_user.id, is_admin=current_user.is_admin())
    return None


@video_router.patch(
    "/by-id/{video_id}/visibility",
    response_model=VideoResponse,
    summary="Update video visibility (public/private)"
)
def update_video_visibility(
    video_id: str,
    payload: VideoVisibilityUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Flip a video between public and private without deleting it."""
    return video_service.update_video_visibility(
        db, video_id, payload.is_public, current_user.id, is_admin=current_user.is_admin()
    )


@video_router.patch(
    "/by-id/{video_id}",
    response_model=VideoResponse,
    summary="Update video metadata (admin Edit Details form)"
)
def update_video_details(
    video_id: str,
    payload: VideoUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Partial update of a video's metadata - title, description, category,
    age rating, release date, director, cast, tags, status. Only fields
    present in the request body are changed."""
    return video_service.update_video_details(
        db, video_id, payload, current_user.id, is_admin=current_user.is_admin()
    )


@video_router.post(
    "/{video_id}/thumbnail",
    response_model=VideoResponse,
    summary="Attach a thumbnail to an already-created video (resumable upload flow)"
)
async def upload_video_thumbnail(
    video_id: str,
    thumbnail: UploadFile = File(..., description="Thumbnail image (JPEG, PNG, WEBP)"),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Used by the tus/resumable upload flow, where the video row already
    exists (created by the tus post-finish hook) before the thumbnail file
    is sent. The multipart create flow attaches its thumbnail inline at
    POST /videos/create instead and never calls this route."""
    return await video_service.upload_video_thumbnail(
        db=db,
        video_id=video_id,
        file=thumbnail,
        user_id=current_user.id,
        is_admin=current_user.is_admin(),
    )


@video_router.get(
    "/by-id/{video_id}/download-url",
    summary="Get a short-lived download URL for the original source file"
)
def get_video_download_url(
    video_id: str,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Returns a presigned MinIO URL (15 min expiry) with
    Content-Disposition: attachment already set, so the browser downloads
    the file instead of playing it inline - a plain frontend <a download>
    doesn't work here since storage is served from a different origin.

    host/scheme are read from this request (Caddy forwards Host unchanged
    and sets X-Forwarded-Proto) rather than any static config, since the
    presigned signature must be bound to whatever public host the browser
    will actually use to reach /storage - that's this same request's own
    host, dev or prod, without needing to hardcode it.
    """
    host = request.headers.get("host", "localhost")
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    url = video_service.get_video_download_url(
        db, video_id, current_user.id, host, scheme, is_admin=current_user.is_admin()
    )
    return {"url": url}


@video_router.post(
    "/{video_id}/view",
    status_code=status.HTTP_200_OK,
    summary="Increment video view count"
)
def increment_video_views(
    video_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Increment view count when video is played. Works for anonymous
    viewers so public watch pages can record a view without requiring
    sign-in."""
    video_service.increment_views(db, video_id)
    return {"message": "View count incremented"}


@video_router.get("/{video_id}/status", response_model=VideoProcessingStatusResponse)
async def get_video_processing_status(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return video_service.get_video_processing_status_service(
        db=db,
        video_id=video_id,
        current_user=current_user,
    )



@video_router.get(
    "/list-all",
    response_model=PaginatedResponse[AdminVideoList],
    summary="Get all video for admin panel"
)
def get_all_videos(
    skip:int = Query(0, ge=0),
    limit:int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status: draft, published, archived"),
    processing_status: Optional[str] = Query(None, description="Filter by processing status"),
    search: Optional[str] = Query(None, description="Search by title or description"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    sort_by: str = Query("created_at", description="Sort field: created_at, title, views_count, etc."),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
        """
    Get all videos with admin-level details including:
    - Processing status and errors
    - Private videos
    - User information
    - Full metadata
    
    Requires admin privileges.
    """
        videos, total = video_service.get_all_videos_admin(
            db=db,
            skip=skip,
            limit=limit,
            status=status,
            processing_status=processing_status,
            search=search,
            user_id=user_id,
            sort_by=sort_by,
            sort_order=sort_order
        )
    
        return PaginatedResponse(
            items=videos,
            total=total,
            skip=skip,
            limit=limit
        )