# app/services/password_reset_service.py
"""
Password reset service.

Handles forgot password and reset password logic.
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
from app.models.password_reset import PasswordResetToken
from app.models.users import User
from app.models.tokens import RefreshToken
from app.services.email_service import send_password_reset_email
from app.core.security import hash_password
import uuid


def request_password_reset(email: str, db: Session) -> dict:
    """
    Send password reset email to user.
    
    Security: Always returns success message even if email doesn't exist
    (prevents email enumeration).
    
    Args:
        email: User's email address
        db: Database session
        
    Returns:
        dict with success message
    """
    
    # Find user by email
    user = db.query(User).filter(User.email == email).first()
    
    # Security: Don't reveal if email exists
    if not user:
        # Return success anyway (prevents email enumeration)
        return {
            "message": "If that email exists, we've sent a password reset link. Check your inbox."
        }
    
    # Rate limiting: Check recent reset requests (max 3 per hour)
    recent_tokens = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.created_at > datetime.now(timezone.utc) - timedelta(hours=1)
    ).count()
    
    if recent_tokens >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset requests. Please try again later."
        )
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    token_expires = datetime.now(timezone.utc) + timedelta(hours=1)  # 1 hour expiry
    
    # Store token in database
    reset_token_record = PasswordResetToken(
        user_id=user.id,
        token=reset_token,
        expires_at=token_expires,
        used=False
    )
    db.add(reset_token_record)
    db.commit()
    
    # Send reset email
    try:
        send_password_reset_email(user.email, user.username, reset_token)
    except Exception as e:
        print(f"Warning: Failed to send password reset email: {e}")
        # Log error but don't fail the request
    
    return {
        "message": "If that email exists, we've sent a password reset link. Check your inbox."
    }


def reset_password(token: str, new_password: str, db: Session) -> dict:
    """
    Reset user's password using token.
    
    Args:
        token: Password reset token from email
        new_password: New password (plain text, will be hashed)
        db: Database session
        
    Returns:
        dict with success message
        
    Raises:
        HTTPException 400: Token invalid, expired, or already used
    """
    
    # Find token in database
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token
    ).first()
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link"
        )
    
    # Check if already used
    if token_record.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link has already been used"
        )
    
    # Check if expired
    if token_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link has expired. Please request a new one."
        )
    
    # Get user
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Hash new password
    hashed_password = hash_password(new_password)
    
    # Update user's password
    user.hashed_password = hashed_password
    
    # Mark token as used
    token_record.used = True
    
    # Security: Invalidate all refresh tokens (logout from all devices)
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id,
        RefreshToken.is_revoked == False
    ).update({"is_revoked": True})
    
    try:
        db.commit()
        return {
            "message": "Password reset successfully! You can now login with your new password."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password. Please try again."
        )