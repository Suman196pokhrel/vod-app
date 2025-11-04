from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional


# ============== INPUT SCHEMAS ==============

# req obj schema for creating a new video
class VideoCreate(BaseModel):
    """Schema for creating a new video"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    video_url: str = Field(..., max_length=500)
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    duration: Optional[int] = Field(None, gt=0)  
    is_public: bool = Field(default=True)


# req to update video data
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
    

    # These allow the pydantic schemas to accept attributes from similar sqlalchemy models
    model_config = ConfigDict(from_attributes=True)



class VideoResponse(BaseModel):
    """Full video data returned to client"""
    id: str
    title: str
    description: Optional[str]
    video_url: str
    thumbnail_url: Optional[str]
    duration: Optional[int]
    views_count: int
    likes_count: int
    is_public: bool
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    user_id: str
    # Optional: include user info
    # user: Optional[UserBrief] = None
    
    model_config = ConfigDict(from_attributes=True)



class VideoList(BaseModel):
    """Lightweight video info for listing multiple videos"""
    id: str
    title: str
    thumbnail_url: Optional[str]
    duration: Optional[int]
    views_count: int
    created_at: datetime
    user_id: str
    # Optional: truncated description
    description: Optional[str] = Field(None, max_length=100)
    
    model_config = ConfigDict(from_attributes=True)