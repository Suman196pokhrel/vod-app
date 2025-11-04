# API routes for authentication (signup, signin, profile)
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse
from app.services.user_service import create_user, authenticate_user
from app.models.user import User


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
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new user account.
    
    **Request Body:**
    - email: Valid email address (must be unique)
    - username: Username (3-50 chars, must be unique)
    - password: Password (min 8 chars)
    
    **Returns:**
    - User data (without password)
    
    **Errors:**
    - 400: Email or username already registered
    """
    user = create_user(db, user_data)
    return user


@auth_router.post(
    "/signin",
    response_model=TokenResponse,
    summary="Login to get access token"
)
def signin(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and get access token.
    
    **Request Body:**
    - email_or_username: Email or username
    - password: User's password
    
    **Returns:**
    - access_token: JWT token for authentication
    - token_type: "bearer"
    - user: User data
    
    **How to use the token:**
    Include in requests as: `Authorization: Bearer <access_token>`
    
    **Errors:**
    - 401: Invalid credentials
    - 403: Account inactive
    """
    return authenticate_user(db, login_data)


@auth_router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile"
)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get the profile of the currently authenticated user.
    
    **Authentication Required:**
    Include JWT token in Authorization header
    
    **Returns:**
    - User profile data
    
    **Errors:**
    - 401: Invalid or expired token
    - 403: Inactive user
    """
    return current_user


# Test endpoint to verify authentication
@auth_router.get(
    "/protected",
    summary="Test protected endpoint"
)
def protected_route(
    current_user: User = Depends(get_current_user)
):
    """
    A test endpoint that requires authentication.
    
    Use this to test if your JWT token is working correctly.
    
    **Returns:**
    - Message with authenticated user's username
    """
    return {
        "message": f"Hello {current_user.username}! This is a protected route.",
        "user_id": current_user.id
    }