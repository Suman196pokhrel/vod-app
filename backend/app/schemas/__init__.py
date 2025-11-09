from app.schemas.user import (
    UserSignUpRequest,
    UserLoginRequest,
    RefreshTokenRequest,
    UserResponse,
    TokenResponse,
    AccessTokenResponse,
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
    "UserSignUpRequest",
    "UserLoginRequest", 
    "RefreshTokenRequest",
    "UserResponse",
    "TokenResponse",
    "AccessTokenResponse",
    "TokenData",
    "VideoCreate",
    "VideoUpdate",
    "UserBrief",
    "VideoResponse",
    "VideoList"
]
