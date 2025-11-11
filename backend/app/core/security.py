# Security utilities for password hashing and JWT token management
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.models import User
from app.core.database import get_db
from app.core.jwt import decode_token
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt, ExpiredSignatureError
from typing import Optional



"""
Security utilities for password hashing and verification.

Why we use bcrypt:
- Industry standard for password hashing
- Automatically handles salting (random data added to password)
- Computationally expensive (slow by design to prevent brute force)
- Future-proof: can increase rounds as computers get faster

Never store plain passwords! Always hash them.
"""

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

security = HTTPBearer()


def hash_password(password:str)->str:
    """
    Hash a plain password using bcrypt.
    
    Args:
        password: Plain text password from user
        
    Returns:
        Hashed password string (safe to store in database)
        
    Example:
        hashed = hash_password("mySecretPass123")
        # Returns something like: $2b$12$randomsaltandhashedpassword...
    """
    return pwd_context.hash(password)



def verify_password(plain_password:str, hashed_password:str)->bool:
    """
    Verify a password against its hash.
    
    Args:
        plain_password: Password entered by user during login
        hashed_password: Hashed password from database
        
    Returns:
        True if password matches, False otherwise
        
    Example:
        is_valid = verify_password("mySecretPass123", user.hashed_password)
        if is_valid:
            # Login successful
    """
    return pwd_context.verify(plain_password, hashed_password)



async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    
    try:
        payload = decode_token(token)
        user_id = payload.get("user_id")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
    except ExpiredSignatureError:
        # ✅ Specific error for expired token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",  # 👈 Specific message
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,  
            detail="Email not verified"
        )

    
    return user