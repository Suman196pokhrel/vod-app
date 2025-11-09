# app/models/password_reset.py
"""
Password reset token model.

Similar to EmailVerificationToken but for password resets.
Tokens expire after 1 hour (shorter than email verification).
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class PasswordResetToken(Base):
    """
    Password reset token model.
    
    Stores tokens for password reset requests.
    Tokens expire after 1 hour for security.
    """
    __tablename__ = "password_reset_tokens"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<PasswordResetToken(user_id={self.user_id}, used={self.used})>"