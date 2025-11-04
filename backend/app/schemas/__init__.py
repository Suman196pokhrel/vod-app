from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    TokenData
)

from app.schemas.video import (
    VideoCreate,
    VideoUpdate,
    UserBrief,
    VideoResponse,
    VideoList
)


# This defines what gets exported when someone does from app.schemas import *.

__all__ = [
    "UserCreate",
    "UserLogin", 
    "UserResponse",
    "TokenResponse",
    "TokenData",
    "VideoCreate",
    "VideoUpdate",
    "UserBrief",
    "VideoResponse",
    "VideoList"
]
