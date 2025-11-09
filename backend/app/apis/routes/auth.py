# API routes for authentication (signup, signin, profile)
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.user import UserSignUpRequest, UserLoginRequest, TokenResponse, RefreshTokenRequest,UserResponse, AccessTokenResponse
from app.services.user_service import create_user, authenticate_user, refresh_access_token, revoke_refresh_token


"""
API ROUTES LAYER EXPLANATION:

This is the top layer that handles HTTP requests/responses.

Responsibilities:
- Define endpoints (URLs)
- Validate request data (using Pydantic schemas)
- Call service layer for business logic
- Return responses

What NOT to do here:
- Don't put business logic here (that goes in services)
- Don't query database directly (use services)
- Keep routes thin and focused
"""


# Create router
auth_router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)





@auth_router.post(
        "/signup",
        response_model=UserResponse,
        status_code=status.HTTP_201_CREATED,
        summary="Register a new user"
        )
def signup(
    user_data:UserSignUpRequest,
    db:Session = Depends(get_db)
):
    user = create_user(user_data, db)
    return user






@auth_router.post(
    "/signin",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Login to get JWT tokens"
)
def signin(user_data:UserLoginRequest, db:Session=Depends(get_db)):
    return authenticate_user(user_data, db)






@auth_router.post(
    "/refresh",
    response_model=AccessTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh access token",
    description="Get a new accesstoken using a valid refresh token"
)
def refresh(
    token_data:RefreshTokenRequest,
    db:Session = Depends(get_db)
):
    return refresh_access_token(token_data.refresh_token, db)





@auth_router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout user",
    description="Revoke refresh token (logout from this session)"
)
async def logout(
    token_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
) -> dict:

    return revoke_refresh_token(token_data.refresh_token, db)

