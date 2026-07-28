# app/services/video/service.py — VideoService: the class every route calls into
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from typing import Optional, List, Tuple
import json
import logging
from datetime import datetime, timezone

from app.schemas.video import VideoMetadata, VideoUpdate, VideoProcessingStatusResponse
from app.models.videos import Video
from app.models.users import User
from app.services.minio_service import minio_service

from .validation import validate_video_file, validate_thumbnail_file
from . import queries, mutations, status, download

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
                validate_video_file(video_file)
                logger.info(f"Video file type validated: {video_file.content_type}")

                if thumbnail_file:
                    validate_thumbnail_file(thumbnail_file)
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

    def get_video_processing_status_service(self, db: Session, video_id: str, current_user: User) -> VideoProcessingStatusResponse:
        return status.get_video_processing_status_service(db, video_id, current_user)

    def get_video_by_id(self, db: Session, video_id: str, user_id: Optional[str] = None, is_admin: bool = False) -> Video:
        return queries.get_video_by_id(db, video_id, user_id, is_admin)

    def get_user_videos(self, db: Session, user_id: str, skip: int = 0, limit: int = 20) -> List[Video]:
        return queries.get_user_videos(db, user_id, skip, limit)

    def get_public_videos(self, db: Session, skip: int = 0, limit: int = 20) -> List[Video]:
        return queries.get_public_videos(db, skip, limit)

    def delete_video(self, db: Session, video_id: str, user_id: str, is_admin: bool = False) -> bool:
        return mutations.delete_video(db, video_id, user_id, is_admin)

    def soft_delete_video(self, db: Session, video_id: str, user_id: str, is_admin: bool = False) -> bool:
        return mutations.soft_delete_video(db, video_id, user_id, is_admin)

    def update_video_visibility(self, db: Session, video_id: str, is_public: bool, user_id: str, is_admin: bool = False) -> Video:
        return mutations.update_video_visibility(db, video_id, is_public, user_id, is_admin)

    def update_video_details(self, db: Session, video_id: str, payload: VideoUpdate, user_id: str, is_admin: bool = False) -> Video:
        return mutations.update_video_details(db, video_id, payload, user_id, is_admin)

    async def upload_video_thumbnail(self, db: Session, video_id: str, file: UploadFile, user_id: str, is_admin: bool = False) -> Video:
        return await mutations.upload_video_thumbnail(db, video_id, file, user_id, is_admin)

    def get_video_download_url(self, db: Session, video_id: str, user_id: str, public_host: str, public_scheme: str, is_admin: bool = False) -> str:
        return download.get_video_download_url(db, video_id, user_id, public_host, public_scheme, is_admin)

    def increment_views(self, db: Session, video_id: str):
        return status.increment_views(db, video_id)

    def get_all_videos_admin(self, db: Session, skip: int = 0, limit: int = 20, status: Optional[str] = None, processing_status: Optional[str] = None, search: Optional[str] = None, user_id: Optional[str] = None, sort_by: str = "created_at", sort_order: str = "desc") -> Tuple[List[Video], int]:
        return queries.get_all_videos_admin(db, skip, limit, status, processing_status, search, user_id, sort_by, sort_order)


# Singleton instance
video_service = VideoService()
