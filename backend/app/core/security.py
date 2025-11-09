# Security utilities for password hashing and JWT token management

from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
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


    """
    Decode and verify a JWT token.
    
    Args:
        token: JWT token string from request header
        
    Returns:
        Decoded data dictionary if valid, None if invalid/expired
        
    Used when:
        Frontend sends token with request -> We decode to get user_id
    """

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=ALGORITHM)
        return payload
    except JWTError:
        return None