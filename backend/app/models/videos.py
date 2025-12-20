# /app/models/videos.py 
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Date, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from sqlalchemy.sql import func


class Video(Base):
    __tablename__ = "videos"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    celery_task_id = Column(String, nullable=True, index=True)


    # Basic Info
    title = Column(String(200), index=True, nullable=False)
    description = Column(String(5000), nullable=True)
    category = Column(String(50), index=True, nullable=False)  # NEW: action, drama, comedy, etc.
    
    # MinIo paths for raw upload 
    raw_video_path = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    
    # Video Metadata
    # will extract this from video itself , duration = Column(Integer, nullable=True)  # Duration in minutes
    age_rating = Column(String(10), nullable=True)  # NEW: G, PG, PG-13, R, TV-14, TV-MA
    release_date = Column(Date, nullable=True)  # NEW: Release date
    
    # Credits
    director = Column(String(200), nullable=True)  # NEW: Director/Creator
    cast = Column(String(500), nullable=True)  # NEW: Comma-separated cast list
    
    # Tags (stored as JSON array for simplicity in MVP)
    tags = Column(JSON, nullable=True, default=list)  # NEW: ["action", "thriller", "2024"]
    
    # Engagement Metrics
    views_count = Column(Integer, default=0)
    likes_count = Column(Integer, default=0)
    
    # Publishing
    is_public = Column(Boolean, default=True)
    status = Column(String(20), default="draft")  # draft, published, scheduled

    # processing status
    processing_status = Column(String(30), default="uploading", index=True)
    # "uploading"              # User uploading (handled by frontend)
    # "queued"                 # Upload done, workflow queued
    # "preparing"              # prepare_video task
    # "transcoding"            # transcode_quality tasks (parallel)
    # "segmenting"             # segment_videos task  
    # "creating_manifest"      # create_manifest task
    # "uploading_to_storage"   # upload_to_minio task
    # "finalizing"             # finalize_processing task
    # "completed"              # All done!
    # "failed"                 # Error occurred

    # Processing medata - stores infrom from prepare_video celery task
    processing_metadata = Column(JSON, nullable=True)
    # Will store: {"duration_seconds": 3600, "width": 1920, "height": 1080, "codec": "h264", "bitrate": 5000000}


    # Error tracking
    processing_error = Column(String(1000), nullable=True)
    # Stores error message if processing_status = "failed"

    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ADD: For HLS streaming (filled after processing completes)
    manifest_url = Column(String(500), nullable=True)  # Path to master.m3u8
    available_qualities = Column(JSON, nullable=True)  # ["1080p", "720p", "480p", "360p"]


    # Foreign key
    user_id = Column(String(100), ForeignKey("users.id"), nullable=False, index=True)
    
    # Relationship
    user = relationship("User", back_populates="videos")