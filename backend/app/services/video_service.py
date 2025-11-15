# Service layer - contains business logic for video operations
# /backend/app/services/video_service.py

from sqlalchemy.orm import Session
from app.schemas.video import VideoCreate, VideoMetadata
from app.models.videos import Video
from app.services.minio_service import minio_service
from fastapi import HTTPException, UploadFile
from typing import Optional, List
import json


class VideoService:
    """Business logic for video operations"""
    
    async def create_video_with_files(
        self,
        db: Session,
        video_file: UploadFile,
        thumbnail_file: Optional[UploadFile],
        metadata_json: str,
        user_id: str
    ) -> Video:
        """
        Upload video and thumbnail to MinIO, then save metadata to PostgreSQL
        
        Args:
            db: Database session
            video_file: Uploaded video file
            thumbnail_file: Uploaded thumbnail file (optional)
            metadata_json: JSON string with video metadata
            user_id: ID of the user uploading the video
            
        Returns:
            Created Video object
        """
        
        try:
            # 1. Parse metadata from JSON string
            metadata_dict = json.loads(metadata_json)
            metadata = VideoMetadata(**metadata_dict)
            
            # 2. Validate file types
            self._validate_video_file(video_file)
            if thumbnail_file:
                self._validate_thumbnail_file(thumbnail_file)
            
            # 3. Upload files to MinIO
            video_path = await minio_service.upload_video(video_file, user_id)
            thumbnail_path = None
            if thumbnail_file:
                thumbnail_path = await minio_service.upload_thumbnail(thumbnail_file, user_id)
            
            # 4. Generate URLs
            video_url = minio_service.get_video_url(video_path)
            thumbnail_url = minio_service.get_thumbnail_url(thumbnail_path) if thumbnail_path else None
            
            # 5. Parse duration (convert "2h 30m" to minutes)
            duration_minutes = self._parse_duration(metadata.duration) if metadata.duration else None
            
            # 6. Determine is_public based on status
            is_public = metadata.status == "published"
            
            # 7. Create database record
            db_video = Video(
                title=metadata.title,
                description=metadata.description,
                video_url=video_path,  # Store MinIO path, not full URL
                thumbnail_url=thumbnail_path,  # Store MinIO path
                duration=duration_minutes,
                is_public=is_public,
                status=metadata.status,
                user_id=user_id,
                views_count=0,
                likes_count=0
            )
            
            db.add(db_video)
            db.commit()
            db.refresh(db_video)
            
            return db_video
            
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid metadata JSON")
        except Exception as e:
            db.rollback()
            # Clean up uploaded files if database operation fails
            if 'video_path' in locals():
                try:
                    minio_service.delete_video(video_path)
                except:
                    pass
            if 'thumbnail_path' in locals() and thumbnail_path:
                try:
                    minio_service.delete_thumbnail(thumbnail_path)
                except:
                    pass
            raise HTTPException(status_code=500, detail=f"Failed to create video: {str(e)}")
    
    def get_video_by_id(self, db: Session, video_id: str, user_id: Optional[str] = None) -> Video:
        """Get video by ID with optional access control"""
        video = db.query(Video).filter(Video.id == video_id).first()
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # If video is private, only owner can access
        if not video.is_public and video.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return video
    
    def get_user_videos(self, db: Session, user_id: str, skip: int = 0, limit: int = 20) -> List[Video]:
        """Get all videos for a specific user"""
        return (
            db.query(Video)
            .filter(Video.user_id == user_id)
            .order_by(Video.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_public_videos(self, db: Session, skip: int = 0, limit: int = 20) -> List[Video]:
        """Get all public videos"""
        return (
            db.query(Video)
            .filter(Video.is_public == True, Video.status == "published")
            .order_by(Video.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def delete_video(self, db: Session, video_id: str, user_id: str) -> bool:
        """Delete video and associated files"""
        video = db.query(Video).filter(Video.id == video_id).first()
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Only owner can delete
        if video.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this video")
        
        try:
            # Delete files from MinIO
            minio_service.delete_video(video.video_url)
            if video.thumbnail_url:
                minio_service.delete_thumbnail(video.thumbnail_url)
            
            # Delete database record
            db.delete(video)
            db.commit()
            
            return True
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete video: {str(e)}")
    
    def increment_views(self, db: Session, video_id: str):
        """Increment video view count"""
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.views_count += 1
            db.commit()
    
    def _validate_video_file(self, file: UploadFile):
        """Validate video file type and size"""
        ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"]
        MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024  # 2GB
        
        if file.content_type not in ALLOWED_VIDEO_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid video format. Allowed: MP4, MOV, WebM"
            )
        
        # Note: file.size might not be available in all cases
        # For production, you'd want to check size during upload
    
    def _validate_thumbnail_file(self, file: UploadFile):
        """Validate thumbnail file type"""
        ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
        
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid thumbnail format. Allowed: JPEG, PNG, WebP"
            )
    
    def _parse_duration(self, duration_str: str) -> Optional[int]:
        """
        Parse duration string like '2h 30m' to total minutes
        Returns None if parsing fails
        """
        try:
            total_minutes = 0
            duration_str = duration_str.lower().strip()
            
            # Parse hours
            if 'h' in duration_str:
                hours_part = duration_str.split('h')[0].strip()
                total_minutes += int(hours_part) * 60
                duration_str = duration_str.split('h')[1].strip()
            
            # Parse minutes
            if 'm' in duration_str:
                minutes_part = duration_str.split('m')[0].strip()
                if minutes_part:
                    total_minutes += int(minutes_part)
            
            return total_minutes if total_minutes > 0 else None
        except:
            return None


# Singleton instance
video_service = VideoService()


# Helper function for backwards compatibility with your existing code
def create_video(db: Session, video_data: VideoCreate, user_id: str) -> Video:
    """
    Legacy function - creates video with URLs already provided
    Use create_video_with_files for new uploads
    """
    db_video = Video(
        title=video_data.title,
        description=video_data.description,
        video_url=video_data.video_url,
        thumbnail_url=video_data.thumbnail_url,
        duration=video_data.duration,
        is_public=video_data.is_public,
        user_id=user_id
    )
    
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    
    return db_video