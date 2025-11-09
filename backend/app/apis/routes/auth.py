# API routes for authentication (signup, signin, profile)
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from pydantic import EmailStr

from app.core.database import get_db
from app.schemas.user import (
    UserSignUpRequest, 
    UserLoginRequest, 
    TokenResponse, 
    RefreshTokenRequest,
    UserResponse, 
    AccessTokenResponse, 
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from app.services import (
    create_user, 
    authenticate_user, 
    refresh_access_token, 
    revoke_refresh_token,
    request_password_reset,
    reset_password
    
)
from app.services.verification_service import (
    verify_email_token, 
    resend_verification_email
)


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


@auth_router.get(
    "/verify-email",
    status_code=status.HTTP_200_OK,
    summary="Verify email address",
    description="Verify user's email using token from email link"
)
async def verify_email(
    token: str,  # Query parameter from URL
    db: Session = Depends(get_db)
) -> dict:
    """
    Verify email address.
    
    User clicks link in email: /verify-email?token=xyz
    """
    return verify_email_token(token, db)


@auth_router.post(
    "/resend-verification",
    status_code=status.HTTP_200_OK,
    summary="Resend verification email",
    description="Resend verification email if user didn't receive it"
)
async def resend_verification(
    request: ResendVerificationRequest, 
    db: Session = Depends(get_db)
) -> dict:
    """
    Resend verification email.
    """
    return resend_verification_email(request.email, db)




@auth_router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="Request password reset",
    description="Send password reset link to user's email"
)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
) -> dict:
    """
    Request password reset.
    
    Sends an email with a password reset link.
    For security, always returns success even if email doesn't exist.
    """
    return request_password_reset(request.email, db)



@auth_router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Reset password",
    description="Reset password using 6-digit code from email"
)
async def reset_password_endpoint(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
) -> dict:
    """
    Reset password using 6-digit code.
    
    - Provide: email, 6-digit code, new password
    - Verifies code is valid, not expired, not used
    - Updates password and logs out from all devices
    """
    return reset_password(request.email, request.code, request.new_password, db)