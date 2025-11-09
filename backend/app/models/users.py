# Alembic  and SQL Alclemy use these schemas to map to DB tables
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy import Enum as SQLEnum  
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.enums import UserRole
from enum import Enum
import uuid



class User(Base):
    """
    User table model.
    
    Stores user credentials, profile info, and role for authorization.
    
    Fields explained:
    - id: UUID primary key (more secure than sequential integers)
    - email: Unique identifier for login
    - username: Display name, also unique
    - hashed_password: Never store plain passwords! Only bcrypt hashes
    - role: Determines what user can do (USER vs ADMIN)
    - is_active: Soft delete / account suspension
    - is_verified: Email verification status (for future email confirmation)
    - created_at: When account was created
    - updated_at: Last modification time
    """

    __tablename__ = "users"


    #primary id
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)


    # Authentication credentials - used for login
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)  
    
    # Authorization - determines permissions
    # Indexed for faster role-based queries
    role = Column(
        SQLEnum(UserRole),
        server_default="USER",  # ← String value, set at DB level
        nullable=False,
        index=True
    )
    # Account status flags
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)  
    
    # Timestamps - automatically managed by postgresql
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships (not actual DB columns, just Python convenience)
    # Uncomment when you create Video model
    videos = relationship("Video", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
    
  

    def is_admin(self) -> bool:
        """
        Convenience method to check if user is an admin.
        
        Usage: if current_user.is_admin(): ...
        """
        return self.role == UserRole.ADMIN