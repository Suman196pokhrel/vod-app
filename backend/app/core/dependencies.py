# Dependencies for authentication and authorization
# /app/core/dependencies.py 

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.jwt import verify_token
from app.models.users import User
from typing import Optional

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Extract and validate JWT access token from Authorization header.
    Returns the authenticated user or raises 401.
    
    Used for protected endpoints that REQUIRE authentication.
    
    Flow:
    1. Extract token from "Authorization: Bearer <token>" header
    2. Verify token signature and expiration using verify_token()
    3. Extract user_id from token payload
    4. Fetch user from database
    5. Return user object
    """
    
    token = credentials.credentials
    
    # Verify token and check it's an access token
    payload = verify_token(token, expected_type="access")
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract user_id from payload (your tokens use 'user_id' not 'sub')
    user_id: str = payload.get("user_id")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Verify that the current user has admin privileges
    """
    if not current_user.is_admin:  
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional authentication - returns User if valid token exists, None otherwise.
    
    Used for endpoints that work BOTH with and without authentication.
    Example: Public video list (but show extra info if user is logged in)
    
    Returns None instead of raising errors for:
    - No token provided
    - Invalid token
    - Expired token
    - User not found
    """
    
    # No token provided - that's okay
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        
        # Verify token
        payload = verify_token(token, expected_type="access")
        
        if not payload:
            return None
        
        # Extract user_id
        user_id: str = payload.get("user_id")
        
        if user_id is None:
            return None
        
        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        return user
        
    except Exception:
        # Any error - just return None (graceful degradation)
        return None