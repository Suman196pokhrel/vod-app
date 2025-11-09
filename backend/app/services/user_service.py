# Service layer - contains business logic for user operations
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from datetime import timedelta, datetime
import hashlib
from app.models import User,RefreshToken
from app.schemas.user import UserSignUpRequest, UserLoginRequest, TokenResponse, UserResponse
from app.core.security import hash_password, verify_password
from app.core.config import get_settings
from app.core.jwt import create_access_token, create_refresh_token, hash_token


"""
WHY A SERVICE LAYER?

The service layer separates business logic from API routes:
- Routes handle HTTP stuff (requests, responses)
- Services handle business logic (create user, verify password)
- This makes code reusable and testable

For example: create_user() can be called from:
- API endpoint
- Admin panel
- Background job
- Unit tests
"""


settings = get_settings()


def create_user(user_data:UserSignUpRequest, db:Session)->User:
    """
    Create a new user account.
    
    This function handles ALL the business logic for user creation:
    - Check if email already exists
    - Check if username already exists
    - Hash the password
    - Create user with default role
    - Save to database
    
    Args:
        user_data: Validated signup data from request
        db: Database session
        
    Returns:
        User: Created user object
        
    Raises:
        HTTPException 400: If email or username already exists
        HTTPException 500: If database error occurs
        
    Example:
        user = create_user(signup_data, db)
    """

    # check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    # check if username is already in use
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")



    hashed_password = hash_password(user_data.password)

    # create user object
    new_user = User(
        email = user_data.email,
        username = user_data.username,
        hashed_password = hashed_password 
    )

    try:
        # add to the db session and commit
        db.add(new_user)
        db.commit()
        # Refresh to get id, created_at from database
        db.refresh(new_user)
        return new_user
    
    except IntegrityError:
        # this happens when email/username already exists
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )
    


def authenticate_user(user_data:UserLoginRequest, db:Session)->TokenResponse:
    # find the user in db
    user = db.query(User).filter(User.email == user_data.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Credentials"
        )

    # verify password
    pw_matched = verify_password(user_data.password, user.hashed_password)

    if not pw_matched:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not verified"
        )

    # Create access token
    access_token_payload = {
        "user_id":user.id,
        "email":user.email,
        "role":user.role.value
    }
    access_token = create_access_token(access_token_payload)


    # Create refresh token
    refresh_token_payload = {
        "user_id" : user.id
    }
    encoded_refresh_token = create_refresh_token(refresh_token_payload)
    hashed_refresh_token = hash_token(encoded_refresh_token)
    expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)


    # storing refresh token in DB
    refresh_token_record = RefreshToken(
        user_id = user.id,
        token_hash = hashed_refresh_token,
        expires_at = expires_at,
        is_revoked = False
    )

    try:
        db.add(refresh_token_record)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session. Please try again."
        )
    
    # Conver user model to response schema
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


    # return complete token response
    return TokenResponse(
        access_token=access_token,
        refresh_token=encoded_refresh_token,
        token_type="bearer",
        user=user_response
    )

def get_user_by_id():
    pass


def get_user_by_email():
    pass


def get_user_by_username():
    pass




