# /app/schemas/videos.py 
from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime, date
from typing import Optional, List, TypeVar, Generic, Any
from app.utils.video_helpers import ProcessingStatus


# ============== INPUT SCHEMAS ==============

class VideoMetadata(BaseModel):
    """Metadata sent from frontend along with files"""
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10, max_length=2000)
    category: str
    ageRating: Optional[str] = None
    director: Optional[str] = Field(None, max_length=200)
    cast: Optional[str] = Field(None, max_length=500)
    releaseDate: Optional[str] = None
    status: str = Field(default="draft")  # draft, published, scheduled
    tags: Optional[List[str]] = None


class VideoFFmpegMetadata(BaseModel):
    duration_seconds: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    codec: Optional[str] = None
    bitrate: Optional[int] = None
    frame_rate: Optional[float] = None
    file_size: Optional[int] = None
    audio_codec: Optional[str] = None
    audio_bitrate: Optional[int] = None

    model_config = ConfigDict(extra="ignore")


class VideoCreate(BaseModel):
    """Schema for creating a new video - Internal use after files are uploaded"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    raw_video_path: str = Field(..., max_length=500)
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    duration: Optional[int]
    is_public: bool = Field(default=True)


class VideoUpdate(BaseModel):
    """Schema for updating video metadata - all fields optional"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    is_public: Optional[bool] = None


# ============== OUTPUT SCHEMAS ==============

class UserBrief(BaseModel):
    """Lightweight user info for nested responses"""
    id: str
    username: str
    
    model_config = ConfigDict(from_attributes=True)


class VideoResponse(BaseModel):
    """Full video data returned to client"""
    id: str
    title: str
    description: Optional[str]
    category: str
    raw_video_path: str
    thumbnail_url: Optional[str]
    age_rating: Optional[str]
    release_date: Optional[date]
    director: Optional[str]
    cast: Optional[List[str]]=None
    tags: Optional[List[str]]
    views_count: int
    likes_count: int
    is_public: bool
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    user_id: str
    
    model_config = ConfigDict(from_attributes=True)

    @field_validator("cast", mode="before")
    @classmethod
    def normalize_cast(cls, v: Any) -> Optional[List[str]]:
        if v is None:
            return None
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        if isinstance(v, str):
            # comma-separated string -> list
            parts = [s.strip() for s in v.split(",") if s.strip()]
            return parts or None
        return None


# Admin-specific video response with all details
class AdminVideoList(BaseModel):
    id: str
    celery_task_id: Optional[str]
    title: str
    description: Optional[str]
    category: str
    raw_video_path: str
    thumbnail_url: Optional[str]
    age_rating: str
    release_date: Optional[date]
    director: Optional[str]
    cast: Optional[List[str]] = None
    tags: Optional[List[str]]
    views_count: int
    likes_count: int
    is_public: bool
    status: str  # draft, published, archived
    processing_status: str
    processing_metadata: Optional[VideoFFmpegMetadata]
    processing_error: Optional[str]
    created_at: datetime
    updated_at: datetime
    manifest_url: Optional[str]
    available_qualities: List[str]
    user_id: str
    
    # Additional admin fields
    user_email: Optional[str] = None  # Join with user table
    user_username: Optional[str] = None
    
    class Config:
        from_attributes = True

    @field_validator("cast", mode="before")
    @classmethod
    def normalize_cast(cls, v: Any) -> Optional[List[str]]:
        if v is None:
            return None
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        if isinstance(v, str):
            parts = [s.strip() for s in v.split(",") if s.strip()]
            return parts or None
        return None

# Paginated response wrapper
T = TypeVar('T')  # This makes the response reusable for any data type:

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]      # The actual data
    total: int          # Total count in DB
    skip: int           # Current offset
    limit: int          # Page size
    
    @property
    def has_more(self) -> bool:
        return self.skip + self.limit < self.total


class VideoList(BaseModel):
    """Lightweight video info for listing multiple videos"""
    id: str
    title: str
    category: str
    thumbnail_url: Optional[str]
    age_rating: Optional[str]
    views_count: int
    created_at: datetime
    user_id: str
    description: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = None
    
    model_config = ConfigDict(from_attributes=True)



class VideoProcessingStatusResponse(BaseModel):
    video_id: str
    status: ProcessingStatus
    progress: int = Field(ge=0, le=100)
    message: str
    error: Optional[str] = None
    is_completed: bool
    is_failed: bool