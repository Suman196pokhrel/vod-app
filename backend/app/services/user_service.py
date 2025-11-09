# Service layer - contains business logic for user operations
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone  
import hashlib
from app.models import User,RefreshToken, EmailVerificationToken
from app.schemas.user import UserSignUpRequest, UserLoginRequest, TokenResponse, RefreshTokenRequest, AccessTokenResponse,UserResponse
from app.core.security import hash_password, verify_password
from app.core.config import get_settings
from app.core.jwt import create_access_token, create_refresh_token, hash_token, decode_token,verify_token
from app.services.email_service import send_verification_email
import uuid

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

        # Generate a verification Token
        verification_token = str(uuid.uuid4())
        token_expires = datetime.now(timezone.utc) + timedelta(hours=24)

        # store token in database
        email_token = EmailVerificationToken(
            user_id=new_user.id,
            token = verification_token,
            expires_at = token_expires,
            used=False
        )

        db.add(email_token)
        db.commit()


        # Send verification email
        try:
            send_verification_email(
                to_email=new_user.email,
                username=new_user.username,
                token=verification_token
            )
        except Exception as e:
            # Log error but don't fail signup
            print(f"Warning: Failed to send verification email: {e}")
            # In production, queue for retry
        
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


def refresh_access_token(refresh_token:RefreshTokenRequest, db:Session)->AccessTokenResponse:
    """
    Create a new access token using a valid refresh token.
    
    This function:
    - Verifies the refresh token JWT
    - Checks token is not revoked in database
    - Checks token is not expired
    - Gets user from database
    - Creates new access token
    
    Args:
        refresh_token: JWT refresh token from client
        db: Database session
        
    Returns:
        AccessTokenResponse: Contains new access_token
        
    Raises:
        HTTPException 401: If token is invalid, revoked, or expired
        HTTPException 404: If user not found
        
    Example:
        response = refresh_access_token(token, db)
        # response.access_token = "eyJnew..."
    """


    # verify and decode the refresh token
    payload = verify_token(refresh_token, expected_type="refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Extract user_id from token payload
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # hash the refresh token to lookup in database
    token_hash = hash_token(refresh_token)


    # lookup in db for token
    token_record = db.query(RefreshToken).filter(RefreshToken.user_id == user_id, RefreshToken.token_hash == token_hash).first()


    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found"
        )
    
    # check if token is revoked
    if token_record.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked"
        )
    

    # check if token is expired (db level check)
    if token_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired"
        )
    

    # Get user from db
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user is still active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    

    # Create new access token
    new_access_token = create_access_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role.value
    })

    return AccessTokenResponse(
        access_token= new_access_token,
        token_type="bearer"
    )


def revoke_refresh_token(refresh_token: str, db: Session) -> dict:
    """
    Revoke a refresh token (logout).
    
    This function:
    - Decodes the refresh token to get user_id
    - Hashes the token
    - Finds it in database
    - Sets is_revoked = True
    
    Args:
        refresh_token: JWT refresh token to revoke
        db: Database session
        
    Returns:
        dict: Success message
        
    Raises:
        HTTPException 401: If token is invalid
        
    Example:
        result = revoke_refresh_token(token, db)
        # result = {"message": "Logged out successfully"}
    """
    
    # 1. Decode token to get user_id (don't need full verification)
    payload = decode_token(refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # 2. Hash the token
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    
    # 3. Find token in database
    token_record = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.token_hash == token_hash
    ).first()
    
    if not token_record:
        # Token not found, but we still return success (idempotent)
        # User might be trying to logout with already-deleted token
        return {"message": "Logged out successfully"}
    
    # 4. Revoke the token
    token_record.is_revoked = True
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout. Please try again."
        )
    
    return {"message": "Logged out successfully"}