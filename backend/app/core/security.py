# Security utilities for password hashing and JWT token management

from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional



"""
SECURITY LAYER EXPLANATION:

1. Password Hashing (bcrypt):
   - NEVER store plain passwords in database
   - bcrypt is a one-way hash - can't reverse it
   - When user logs in, we hash their input and compare hashes

2. JWT Tokens:
   - After login, we give user a token
   - Token contains user_id (encrypted)
   - Frontend sends this token with each request
   - We verify token to authenticate requests
"""

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# JWT Configuration
# MUST change in production
SECRET_KEY = "your-secret-key-change-this-in-production"  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30




def hash_password(password:str)->str:
    return pwd_context.hash(password)



def verify_password(plain_password:str, hashed_password:str)->str:
    return pwd_context.verify(plain_password, hashed_password)



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