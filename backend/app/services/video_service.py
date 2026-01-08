# Service layer - contains business logic for video operations
# /backend/app/services/video_service.py

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc
from app.schemas.video import VideoCreate, VideoMetadata
from app.models.videos import Video
from app.services.minio_service import minio_service
from app.models.users import User  
from app.schemas.video import VideoProcessingStatusResponse
from app.utils.video_helpers import DEFAULT_META, STATUS_META, ProcessingStatus

from fastapi import HTTPException, UploadFile
from typing import Optional, List, Tuple
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

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
        Upload video and thumbnail to MinIO, then save metadata to PostgreSQL.
        Implements proper rollback on failure.
        
        Args:
            db: Database session
            video_file: Uploaded video file
            thumbnail_file: Uploaded thumbnail file (optional)
            metadata_json: JSON string with video metadata
            user_id: ID of the user uploading the video
            
        Returns:
            Created Video object
            
        Raises:
            HTTPException: On validation or processing errors
        """
        
        logger.info("Starting video creation process")
        logger.info(f"User ID: {user_id}")
        logger.info(f"Video file: {video_file.filename if video_file else 'None'}")
        logger.info(f"Thumbnail file: {thumbnail_file.filename if thumbnail_file else 'None'}")
        
        # Track uploaded files for rollback
        video_path = None
        thumbnail_path = None
        db_committed = False
        
        try:
            # Step 1: Validate video file presence
            logger.info("Step 1: Validating video file presence")
            if not video_file:
                logger.error("Video file validation failed: No file provided")
                raise HTTPException(status_code=400, detail="Video file is required")
            logger.info("Video file presence validated")
            
            # Step 2: Parse and validate metadata
            logger.info("Step 2: Parsing metadata JSON")
            try:
                metadata_dict = json.loads(metadata_json)
                metadata = VideoMetadata(**metadata_dict)
                logger.info(f"Metadata parsed successfully: title='{metadata.title}', category='{metadata.category}'")
            except json.JSONDecodeError as e:
                logger.error(f"Metadata parsing failed: Invalid JSON - {str(e)}")
                raise HTTPException(status_code=400, detail="Invalid metadata JSON format")
            except Exception as e:
                logger.error(f"Metadata validation failed: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Invalid metadata: {str(e)}")
            
            # Step 3: Validate file types
            logger.info("Step 3: Validating file types")
            try:
                self._validate_video_file(video_file)
                logger.info(f"Video file type validated: {video_file.content_type}")
                
                if thumbnail_file:
                    self._validate_thumbnail_file(thumbnail_file)
                    logger.info(f"Thumbnail file type validated: {thumbnail_file.content_type}")
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"File type validation failed: {str(e)}")
                raise HTTPException(status_code=400, detail=f"File validation failed: {str(e)}")
            
            # Step 4: Upload video to MinIO
            logger.info("Step 4: Uploading video to MinIO")
            try:
                video_path = await minio_service.upload_video(video_file, user_id)
                logger.info(f"Video uploaded successfully to MinIO: {video_path}")
            except Exception as e:
                logger.error(f"Video upload to MinIO failed: {str(e)}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to upload video to storage: {str(e)}"
                )
            
            # Step 4.1: Verify video_path is not None
            if not video_path:
                logger.error("Critical error: video_path is None after successful upload")
                raise HTTPException(
                    status_code=500, 
                    detail="Video upload did not return a valid path"
                )
            
            # Step 5: Upload thumbnail to MinIO (optional, non-critical)
            if thumbnail_file:
                logger.info("Step 5: Uploading thumbnail to MinIO")
                try:
                    thumbnail_path = await minio_service.upload_thumbnail(thumbnail_file, user_id)
                    logger.info(f"Thumbnail uploaded successfully to MinIO: {thumbnail_path}")
                except Exception as e:
                    logger.warning(f"Thumbnail upload failed (non-critical): {str(e)}")
                    logger.warning("Continuing without thumbnail")
                    thumbnail_path = None
            else:
                logger.info("Step 5: No thumbnail provided, skipping thumbnail upload")
            
            # Step 6: Parse release date
            logger.info("Step 6: Processing release date")
            release_date = None
            if metadata.releaseDate:
                try:
                    release_date = datetime.fromisoformat(
                        metadata.releaseDate.replace('Z', '+00:00')
                    ).date()
                    logger.info(f"Release date parsed: {release_date}")
                except Exception as e:
                    logger.warning(f"Failed to parse release date: {str(e)}")
                    logger.warning("Continuing without release date")
                    release_date = None
            else:
                logger.info("No release date provided")
            
            # Step 7: Prepare database record
            logger.info("Step 7: Preparing database record")
            is_public = metadata.status == "published"
            logger.info(f"Video visibility: {'public' if is_public else 'private'}")
            
            db_video = Video(
                title=metadata.title,
                description=metadata.description,
                category=metadata.category,
                raw_video_path=video_path,
                thumbnail_url=thumbnail_path,
                age_rating=metadata.ageRating,
                release_date=release_date,
                director=metadata.director,
                cast=metadata.cast,
                tags=metadata.tags if metadata.tags else [],
                is_public=is_public,
                status=metadata.status,
                processing_status="queued",
                user_id=user_id,
                views_count=0,
                likes_count=0
            )
            
            # Step 8: Insert into database
            logger.info("Step 8: Inserting record into database")
            try:
                db.add(db_video)
                db.commit()
                db_committed = True
                db.refresh(db_video)
                logger.info(f"Database record created successfully: video_id={db_video.id}")

                if db_committed:
                   from app.tasks.workflows import start_video_processing
                   
                   try:
                    task_result = start_video_processing(db_video.id)
                    db_video.celery_task_id = task_result.id
                    db.commit()
                    logger.info(f"Video processing pipeline started for video_id: {task_result.id}")
                   except Exception as e:
                       logger.error(f"Failed to start processing workflow: {str(e)}")
                    
            except Exception as e:
                logger.error(f"Database insertion failed: {str(e)}")
                db.rollback()
                logger.info("Database transaction rolled back")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to save video metadata to database: {str(e)}"
                )
            
            # Success
            logger.info("Video creation process completed successfully")
            logger.info(f"Video ID: {db_video.id}")
            logger.info(f"Video path: {video_path}")
            logger.info(f"Thumbnail path: {thumbnail_path if thumbnail_path else 'None'}")
            
            return db_video
            
        except HTTPException:
            # HTTPException is already logged and formatted, just re-raise
            logger.error("Video creation failed with HTTPException")
            raise
            
        except Exception as e:
            # Unexpected error
            logger.error(f"Unexpected error during video creation: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, 
                detail=f"An unexpected error occurred: {str(e)}"
            )
            
        finally:
            # Rollback logic: Clean up MinIO if database operation failed
            if not db_committed:
                logger.warning("Database commit did not complete, initiating MinIO cleanup")
                
                # Clean up video from MinIO
                if video_path:
                    logger.info(f"Attempting to delete video from MinIO: {video_path}")
                    try:
                        minio_service.delete_video(video_path)
                        logger.info("Video deleted from MinIO successfully")
                    except Exception as cleanup_error:
                        logger.error(f"Failed to cleanup video from MinIO: {str(cleanup_error)}")
                        logger.error("Manual cleanup may be required for video: {video_path}")
                
                # Clean up thumbnail from MinIO
                if thumbnail_path:
                    logger.info(f"Attempting to delete thumbnail from MinIO: {thumbnail_path}")
                    try:
                        minio_service.delete_thumbnail(thumbnail_path)
                        logger.info("Thumbnail deleted from MinIO successfully")
                    except Exception as cleanup_error:
                        logger.error(f"Failed to cleanup thumbnail from MinIO: {str(cleanup_error)}")
                        logger.error(f"Manual cleanup may be required for thumbnail: {thumbnail_path}")
            else:
                logger.info("Database commit successful, no cleanup required")
    
    def _validate_video_file(self, file: UploadFile):
        """
        Validate video file type
        
        Args:
            file: Uploaded file to validate
            
        Raises:
            HTTPException: If validation fails
        """
        if not file:
            raise HTTPException(status_code=400, detail="Video file is required")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="Video file must have a filename")
        
        allowed_types = [
            "video/mp4", 
            "video/mpeg", 
            "video/quicktime", 
            "video/x-msvideo",
            "video/x-matroska"  # .mkv
        ]
        
        if file.content_type not in allowed_types:
            logger.warning(f"Invalid video content type: {file.content_type}")
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid video format. Allowed types: mp4, mpeg, mov, avi, mkv"
            )
    
    def _validate_thumbnail_file(self, file: UploadFile):
        """
        Validate thumbnail file type
        
        Args:
            file: Uploaded file to validate
            
        Raises:
            HTTPException: If validation fails
        """
        if not file:
            return
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="Thumbnail file must have a filename")
        
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        
        if file.content_type not in allowed_types:
            logger.warning(f"Invalid thumbnail content type: {file.content_type}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid thumbnail format. Allowed types: jpeg, png, webp"
            )

    def get_video_processing_status_service(
        self,
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

    def get_all_videos_admin(
        self,
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
        print("ADMIN VIDEOS API HIT")
        # BASE QUERY
        query = db.query(Video).options(joinedload(Video.user))
        
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



# Singleton instance
video_service = VideoService()


# Helper function for backwards compatibility
def create_video(db: Session, video_data: VideoCreate, user_id: str) -> Video:
    """
    Legacy function - creates video with URLs already provided
    Use create_video_with_files for new uploads
    """
    db_video = Video(
        title=video_data.title,
        description=video_data.description,
        category="uncategorized",  # Default category
        video_url=video_data.video_url,
        thumbnail_url=video_data.thumbnail_url,
        duration=video_data.duration,
        is_public=video_data.is_public,
        user_id=user_id,
        tags=[]
    )
    
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    
    return db_video