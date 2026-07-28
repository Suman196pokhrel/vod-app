# app/services/video/queries.py - read-only video lookups (by id, by user, public feed, admin listing)
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc
from fastapi import HTTPException
from typing import Optional, List, Tuple

from app.models.videos import Video


def get_video_by_id(db: Session, video_id: str, user_id: Optional[str] = None, is_admin: bool = False) -> Video:
    """Get video by ID with optional access control.

    Private videos are indistinguishable from missing ones to anyone
    but the owner/admin — a 403 would confirm the video exists, so
    denied access returns 404 instead. Soft-deleted videos 404 the
    same way for everyone, owner/admin included."""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # If video is private, only owner or admin can access
    if not video.is_public and video.user_id != user_id and not is_admin:
        raise HTTPException(status_code=404, detail="Video not found")

    return video


def get_user_videos(db: Session, user_id: str, skip: int = 0, limit: int = 20) -> List[Video]:
    """Get all videos for a specific user"""
    return (
        db.query(Video)
        .filter(Video.user_id == user_id, Video.deleted_at.is_(None))
        .order_by(Video.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_public_videos(db: Session, skip: int = 0, limit: int = 20) -> List[Video]:
    """Get all public videos"""
    return (
        db.query(Video)
        .filter(Video.is_public == True, Video.status == "published", Video.deleted_at.is_(None))
        .order_by(Video.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_all_videos_admin(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    processing_status: Optional[str] = None,
    search: Optional[str] = None,
    user_id: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc"
) -> Tuple[List[Video], int]:
    """
    Get videos for admin panel with filtering, searching, and sorting
    Returns tuple of (videos, total_count)
    """
    # BASE QUERY — soft-deleted videos never show up here either; the
    # admin table should look exactly like it did with hard delete.
    query = db.query(Video).options(joinedload(Video.user)).filter(Video.deleted_at.is_(None))

    # Apply filters on BASE QUERY
    if status:
        query = query.filter(Video.status == status)

    if processing_status:
        query = query.filter(Video.processing_status == processing_status)

    if user_id:
        query = query.filter(Video.user_id == user_id)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Video.title.ilike(search_pattern),
                Video.description.ilike(search_pattern)
            )
        )

    # Get total count before pagination // this also triggers a DB call that executes the query we've been building till now
    total = query.count()

    # Apply sorting
    sort_column = getattr(Video, sort_by, Video.created_at)
    if sort_order == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    # Apply pagination
    videos = query.offset(skip).limit(limit).all()

    # Attach user info to each video for the response
    for video in videos:
        if video.user:
            video.user_email = video.user.email
            video.user_username = video.user.username

    return videos, total
