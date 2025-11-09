"""
Refresh token model for managing user sessions.

Why we need this:
- Allows logout from all devices (revoke all tokens)
- Track active sessions per user
- Provides better security (can blacklist compromised tokens)

For MVP: You can skip this and use stateless JWT refresh tokens.
For Production: This is recommended.
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class RefreshToken(Base):
    """
    Stores refresh tokens for session management.
    
    Each time a user logs in, we create a refresh token record.
    When they logout, we revoke it.
    """

    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # which user owns this token
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # hashed version of the refresh token - not storing raw tokens
    token_hash = Column(String, nullable=False, index=True)

    # Expiration time
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Revocation - for logouts
    is_revoked = Column(Boolean, default=False)

    # When was it created
    created_at = Column(DateTime(timezone=True), server_default=func.now())


    def __repr__(self):
        return f"<RefreshToken(user_id={self.user_id}, revoked={self.is_revoked})>"
