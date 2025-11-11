from fastapi import APIRouter, Depends, status
from app.models import User
from app.core.security import get_current_user
from app.schemas import (
    UserResponse
)


user_router = APIRouter(
    prefix="/user",
    tags=["User"]
)


@user_router.get(
    "/profile",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Returns the current users credentials"
    )
async def get_profile(
    current_user:User = Depends(get_current_user)
):
    """
    Get current user's profile.
    Requires valid access token
    """
    return current_user