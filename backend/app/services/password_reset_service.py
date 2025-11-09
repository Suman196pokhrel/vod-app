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
import random


def generate_otp() -> str:
    """
    Generate a random 6-digit OTP.
    
    Returns:
        String of 6 digits (e.g., "842719")
    """
    return str(random.randint(100000, 999999))

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
    reset_code = generate_otp()
    token_expires = datetime.now(timezone.utc) + timedelta(hours=1)  # 1 hour expiry
    
    # Store token in database
    reset_token_record = PasswordResetToken(
        user_id=user.id,
        token=reset_code,
        expires_at=token_expires,
        used=False
    )
    db.add(reset_token_record)
    db.commit()
    
    # Send reset email
    try:
        send_password_reset_email(user.email, user.username, reset_code)
    except Exception as e:
        print(f"Warning: Failed to send password reset email: {e}")
        # Log error but don't fail the request
    
    return {
        "message": "If that email exists, we've sent a password reset link. Check your inbox."
    }


def reset_password(email: str, code: str, new_password: str, db: Session) -> dict:
    """
    Reset password using email and 6-digit code.
    
    Args:
        email: User's email address
        code: 6-digit reset code from email
        new_password: New password
        db: Database session
        
    Returns:
        dict with success message
    """
    
    # Find user by email
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or reset code"
        )
    
    # Find token for this user and code
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.token == code  
    ).first()
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code"
        )
    
    # Check if already used
    if token_record.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset code has already been used"
        )
    
    # Check if expired
    if token_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code has expired. Please request a new one."
        )
    
    # Hash new password
    hashed_password = hash_password(new_password)
    
    # Update password
    user.hashed_password = hashed_password
    token_record.used = True
    
    # Invalidate all refresh tokens (logout from all devices)
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