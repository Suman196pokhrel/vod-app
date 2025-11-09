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



# Optional: Check if a hash needs to be updated (if we increase bcrypt rounds later)
def needs_update(hashed_password: str) -> bool:
    """
    Check if a password hash needs to be updated.
    
    Useful if you increase bcrypt rounds in the future.
    During login, if this returns True, rehash the password.
    
    Returns:
        True if hash should be updated, False otherwise
    """
    return pwd_context.needs_update(hashed_password)





def create_access_token(data:dict, expires_delta:Optional[timedelta]= None)->str:
    """
    Create a JWT access token.
    
    Args:
        data: Dictionary to encode in token (usually {"user_id": "123"})
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
        
    How it works:
        1. Copy the data
        2. Add expiration time
        3. Encode with SECRET_KEY
        4. Return token string
    """

    to_encode = data.copy()

    # set expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp":expire})

    # encode and return
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt




def decode_access_token(token:str)-> Optional[dict]:
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