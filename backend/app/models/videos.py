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

    # Basic Info
    title = Column(String(200), index=True, nullable=False)
    description = Column(String(5000), nullable=True)
    category = Column(String(50), index=True, nullable=False)  # NEW: action, drama, comedy, etc.
    
    # File URLs (MinIO paths)
    video_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    
    # Video Metadata
    duration = Column(Integer, nullable=True)  # Duration in minutes
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
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Foreign key
    user_id = Column(String(100), ForeignKey("users.id"), nullable=False, index=True)
    
    # Relationship
    user = relationship("User", back_populates="videos")