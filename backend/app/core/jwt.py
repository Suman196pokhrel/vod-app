# app/core/jwt.py
"""
JWT (JSON Web Token) utilities for authentication.

What is a JWT?
- A token with 3 parts: Header.Payload.Signature
- Self-contained: carries user info inside (no DB lookup needed)
- Stateless: server doesn't store them (unlike sessions)
- Signed: can't be tampered with (signature verification)

Token Types:
1. Access Token (short-lived, 15-30 min):
   - Used for API requests
   - Contains user_id, email, role
   - Expires quickly for security

2. Refresh Token (long-lived, 7 days):
   - Used to get new access tokens
   - Contains only user_id
   - Stored in database for revocation
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from app.core.config import get_settings

settings = get_settings()


def create_access_token(data:Dict[str, Any])->str:
    """
    Create a JWT access token.
    
    Access tokens are short-lived and used for API authentication.
    They contain user information (id, email, role).
    
    Args:
        data: Dictionary with user info to encode
              Example: {"user_id": "123", "email": "user@example.com", "role": "admin"}
    
    Returns:
        JWT token string
        
    Example:
        token = create_access_token({
            "user_id": user.id,
            "email": user.email,
            "role": user.role.value
        })
    """

    to_encode = data.copy()


    # Add expiration time
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({
        "exp":expire,
        "type":"access"
    })

    # Create and sign the token
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )

    return encoded_jwt


def create_refresh_token(data:Dict[str,Any])->str:
    """
    Create a JWT refresh token.
    
    Refresh tokens are long-lived and used to obtain new access tokens.
    They contain minimal info (just user_id) for security.
    
    Args:
        data: Dictionary with minimal user info
              Example: {"user_id": "123"}
    
    Returns:
        JWT token string
        
    Example:
        token = create_refresh_token({"user_id": user.id})
    """
    to_encode = data.copy()

    # Add expiration time 
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({
        "exp":expire,
        "type":"refresh"
    })


    # create and sign the token
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )

    return encoded_jwt


def decode_token(token:str)->Optional[Dict["str",Any]]:
    """
    Decode and verify a JWT token.
    
    This function:
    1. Verifies the signature (ensures token wasn't tampered with)
    2. Checks expiration (ensures token is still valid)
    3. Returns the payload data
    
    Args:
        token: JWT token string
        
    Returns:
        Dictionary with token payload if valid, None if invalid/expired
        
    Example:
        payload = decode_token(token)
        if payload:
            user_id = payload.get("user_id")
            token_type = payload.get("type")
    """

    try:
        #Decode and verity the token
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )

        return payload
    
    except JWTError:
        # token is invalid , expired or tampered with
        return None


def verify_token(token:str, expected_type:str="access")->Optional[Dict[str,Any]]:
    """
    Verify a token and check its type.
    
    This is a convenience wrapper around decode_token that also
    validates the token type (access vs refresh).
    
    Args:
        token: JWT token string
        expected_type: Expected token type ("access" or "refresh")
        
    Returns:
        Token payload if valid and correct type, None otherwise
        
    Example:
        # Verify access token
        payload = verify_token(token, "access")
        if payload:
            user_id = payload["user_id"]
        
        # Verify refresh token
        payload = verify_token(refresh_token, "refresh")
    """
    payload = decode_token(token)

    if not payload:
        return None
    
    # check if token type matches what we expect
    token_type = payload.get("type")
    if token_type != expected_type:
        return None
    
    return payload


def get_token_expiry(token:str)->Optional[datetime]:
    """
    Get the expiration time of a token.
    
    Useful for debugging or displaying "session expires in X minutes" to users.
    
    Args:
        token: JWT token string
        
    Returns:
        datetime object of expiration time, or None if token invalid
    """

    payload = decode_token(token)

    if not payload:
        return None
    
    exp_time = payload.get("exp")
    if not exp_time:
        return None
    
    return datetime.fromtimestamp(exp_time)