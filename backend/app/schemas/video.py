# /app/schemas/videos.py 
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, date
from typing import Optional, List


# ============== INPUT SCHEMAS ==============

class VideoMetadata(BaseModel):
    """Metadata sent from frontend along with files"""
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10, max_length=2000)
    category: str
    duration: Optional[str] = None
    ageRating: Optional[str] = None
    director: Optional[str] = Field(None, max_length=200)
    cast: Optional[str] = Field(None, max_length=500)
    releaseDate: Optional[str] = None
    status: str = Field(default="draft")  # draft, published, scheduled
    tags: Optional[List[str]] = None


class VideoCreate(BaseModel):
    """Schema for creating a new video - Internal use after files are uploaded"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    video_url: str = Field(..., max_length=500)
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    duration: Optional[int] = Field(None, gt=0)  
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
    video_url: str
    thumbnail_url: Optional[str]
    duration: Optional[int]
    age_rating: Optional[str]
    release_date: Optional[date]
    director: Optional[str]
    cast: Optional[str]
    tags: Optional[List[str]]
    views_count: int
    likes_count: int
    is_public: bool
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    user_id: str
    
    model_config = ConfigDict(from_attributes=True)


class VideoList(BaseModel):
    """Lightweight video info for listing multiple videos"""
    id: str
    title: str
    category: str
    thumbnail_url: Optional[str]
    duration: Optional[int]
    age_rating: Optional[str]
    views_count: int
    created_at: datetime
    user_id: str
    description: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = None
    
    model_config = ConfigDict(from_attributes=True)