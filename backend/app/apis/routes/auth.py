# API routes for authentication (signup, signin, profile)
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.user import UserSignUpRequest, UserLoginRequest, TokenResponse, UserResponse
from app.services.user_service import create_user, authenticate_user
from app.models.users import User


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

# @auth_router.get(
#     "/me",
#     response_model=UserResponse,
#     summary="Get current user profile"
# )
# def get_my_profile(
#     current_user: User = Depends(get_current_user)
# ):
#     """
#     Get the profile of the currently authenticated user.
    
#     **Authentication Required:**
#     Include JWT token in Authorization header
    
#     **Returns:**
#     - User profile data
    
#     **Errors:**
#     - 401: Invalid or expired token
#     - 403: Inactive user
#     """
#     return current_user


# # Test endpoint to verify authentication
# @auth_router.get(
#     "/protected",
#     summary="Test protected endpoint"
# )
# def protected_route(
    current_user: User = Depends(get_current_user)
# ):
#     """
#     A test endpoint that requires authentication.
    
#     Use this to test if your JWT token is working correctly.
    
#     **Returns:**
#     - Message with authenticated user's username
#     """
#     return {
#         "message": f"Hello {current_user.username}! This is a protected route.",
#         "user_id": current_user.id
#     }