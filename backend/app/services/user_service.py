# Service layer - contains business logic for user operations
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from datetime import timedelta

from backend.app.models.users import User
from app.schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import get_settings


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


def create_user(db:Session, user_data:UserCreate)->User:
    """
    Create a new user in the database.
    
    Args:
        db: Database session
        user_data: Validated user data from request
        
    Returns:
        Created User object
        
    Raises:
        HTTPException: If email/username already exists
        
    Steps:
        1. Hash the password (NEVER store plain passwords!)
        2. Create User object
        3. Add to database
        4. Commit transaction
        5. Refresh to get database-generated fields (id, created_at)
    """

    hashed_password = hash_password(user_data.password)

    # create user object
    db_user = User(
        email = user_data.email,
        username = user_data.username,
        hashed_password = hash_password 
    )

    try:
        # add to the db session and commit
        db.add(db_user)
        db.commit()
        # Refresh to get id, created_at from database
        db.refresh(db_user)
        return db_user
    
    except IntegrityError:
        # this happens when email/username already exists
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )
    


def authenticate_user():
    pass



def get_user_by_id():
    pass


def get_user_by_email():
    pass


def get_user_by_username():
    pass




