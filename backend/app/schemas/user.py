# Pydantic schemas - for data validation and serialization
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional

from app.models.enums import UserRole


"""
WHY PYDANTIC SCHEMAS?
1. Validate incoming data (requests from frontend)
2. Define response structure (what we send back)
3. Keep passwords out of responses (security!)
4. Separate from SQLAlchemy models (database vs API concerns)
"""


# base Schema with common fields
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)





################--REQUEST SCHEMAS--##################################

class UserSignUpRequest(UserBase):
    """
    Schema for user signup/registration.
    
    What the frontend sends when a user creates an account.
    Password is required but will be hashed before storage.
    Role is NOT included - always defaults to 'user' on backend.
    """
    password: str = Field(
        ..., 
        min_length=8, 
        max_length=100,
        description="Password must be at least 8 characters"
    )


class UserLoginRequest(BaseModel):
    """
        Schema for login requests

        User can login with email or username_password
    """
    email: EmailStr
    password: str = Field(..., min_length=8)


class RefreshTokenRequest(BaseModel):
    """
        Schema for token refresh requests.

        Client sends refresh token to get a new access token.
    """

    refresh_token:str = Field(..., description="Valid refresh token")




class ResendVerificationRequest(BaseModel):
    """
    Schema for resending verification email.
    """
    email: EmailStr = Field(..., description="Email address to resend verification to")



################--RESPONSE SCHEMAS--##################################

class UserResponse(UserBase):
    """
    Schema for user data in responses.
    
    This is what we send back to the client.
    Note: hashed_password is NEVER included!
    """
    id: str
    role: UserRole  
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# for authentication responses 
class TokenResponse(BaseModel):
    """
    Schema for authentication responses.
    
    Returned after successful login or token refresh.
    Contains both access and refresh tokens.
    """
    access_token: str
    refresh_token: str  
    token_type: str = "bearer"
    user: UserResponse  




class AccessTokenResponse(BaseModel):
    """
    Schema for refresh endpoint response.
    
    Returned when refreshing access token (no user info needed).
    """
    access_token: str
    token_type: str = "bearer"





# ===== INTERNAL SCHEMAS (Used in JWT payload, not API responses) =====

class TokenData(BaseModel):
    """
    Data structure inside JWT tokens.
    
    This is what we encode in the JWT payload.
    Used internally for token verification, not sent to client.
    """
    user_id: str
    email: EmailStr  
    role: UserRole  
    
    # Note: 'exp' (expiration) is added by JWT library automatically