# Pydantic schemas - for data validation and serialization
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional


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



# For User Registration
class UserCreate(UserBase):
    """
        Schema for signup requests.
        This is what the frontend sends when a user signs up.
        We require password here but won't store it directly.
    """
    password:str = Field(..., min_length=8, max_length=100)

# For user login
class UserLogin(BaseModel):
    """
        Schema for login requests

        User can login with email or username_password
    """
    email_or_username: str
    password: str


# what we send back to the client 
class UserResponse(UserBase):
    id:str
    is_active:bool
    is_verified:bool
    created_at:datetime
    updated_at: Optional[datetime] = None


    # this tells pydantic to work with sqlalchemy models
    model_config = ConfigDict(from_attributes=True)


# for authentication responses 
class TokenResponse(BaseModel):
    """
        What we send back after successful login
    """

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# For token data (inside JWT)
class TokenData(BaseModel):
    """
        we keep it minimal
    """
    user_id:str