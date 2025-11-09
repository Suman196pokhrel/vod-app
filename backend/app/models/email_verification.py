# app/models/email_verification.py
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class EmailVerificationToken(Base):
    """
    Email verification token model.
    
    Stores tokens sent to users for email verification.
    Tokens expire after 24 hours for security.
    """
    __tablename__ = "email_verification_tokens"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<EmailVerificationToken(user_id={self.user_id}, used={self.used})>"