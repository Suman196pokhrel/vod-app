# Alembic  and SQL Alclemy use these schemas to map to DB tables
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
import uuid



class User(Base):
    """
    User table model.
    
    This class defines the structure of the 'users' table in database.
    Each attribute becomes a column in the table.
    
    Why we use this:
    - SQLAlchemy ORM (Object-Relational Mapping) lets us work with Python objects
      instead of writing raw SQL queries
    - The Base class (from database.py) tracks all models and helps create tables
    """
    __tablename__ = "users"


    #primary id
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)

    # User credentials and info
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)  
    
    # User status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)  
    
    # Timestamps - automatically managed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, username={self.username})>"