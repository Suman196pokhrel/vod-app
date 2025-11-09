# app/services/verification_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timezone
from app.models.email_verification import EmailVerificationToken
from app.models.users import User


def verify_email_token(token: str, db: Session) -> dict:
    """
    Verify email using token.
    
    Args:
        token: Verification token from email link
        db: Database session
        
    Returns:
        dict with success message
        
    Raises:
        HTTPException 400: Token invalid, expired, or already used
    """
    
    # Find token in database
    token_record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == token
    ).first()
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
    
    # Check if already used
    if token_record.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link has already been used"
        )
    
    # Check if expired
    if token_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification link has expired. Please request a new one."
        )
    
    # Get user
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if already verified
    if user.is_verified:
        return {
            "message": "Email already verified. You can login now.",
            "already_verified": True
        }
    
    # Verify user
    user.is_verified = True
    token_record.used = True
    
    try:
        db.commit()
        return {
            "message": "Email verified successfully! You can now login.",
            "already_verified": False
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify email. Please try again."
        )


def resend_verification_email(email: str, db: Session) -> dict:
    """
    Resend verification email to user.
    
    Useful if user didn't receive email or link expired.
    """
    from app.services.email_service import send_verification_email
    import uuid
    from datetime import timedelta
    
    # Find user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal if email exists (security)
        return {"message": "If that email exists, we've sent a verification link"}
    
    # Check if already verified
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Check rate limiting (max 3 emails per hour)
    recent_tokens = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user.id,
        EmailVerificationToken.created_at > datetime.now(timezone.utc) - timedelta(hours=1)
    ).count()
    
    if recent_tokens >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification emails sent. Please try again later."
        )
    
    # Generate new token
    verification_token = str(uuid.uuid4())
    token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    
    email_token = EmailVerificationToken(
        user_id=user.id,
        token=verification_token,
        expires_at=token_expires
    )
    db.add(email_token)
    db.commit()
    
    # Send email
    send_verification_email(user.email, user.username, verification_token)
    
    return {"message": "Verification email sent. Please check your inbox."}