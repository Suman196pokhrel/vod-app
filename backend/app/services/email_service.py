# app/services/email_service.py
"""
Email service for sending verification emails.

For MVP: Uses SMTP (Gmail)
For Production: Use SendGrid, AWS SES, or Mailgun
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import get_settings

settings = get_settings()


def send_verification_email(to_email: str, username: str, token: str):
    """
    Send email verification link to user.
    
    Args:
        to_email: User's email address
        username: User's username (for personalization)
        token: Verification token
    """
    
    # Create verification link
    verification_link = f"{settings.frontend_url}/verify-email?token={token}"
    
    # Email content
    subject = "Verify Your Email - VOD Platform"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 15px 30px; background: #667eea; 
                      color: white; text-decoration: none; border-radius: 5px; 
                      font-weight: bold; margin: 20px 0; }}
            .button:hover {{ background: #5568d3; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to VOD Platform! 🎬</h1>
            </div>
            <div class="content">
                <p>Hi <strong>{username}</strong>,</p>
                
                <p>Thanks for signing up! We're excited to have you on board.</p>
                
                <p>To get started, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center;">
                    <a href="{verification_link}" class="button">
                        Verify Email Address
                    </a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="background: #e9e9e9; padding: 10px; border-radius: 5px; word-break: break-all;">
                    {verification_link}
                </p>
                
                <p><strong>This link will expire in 24 hours.</strong></p>
                
                <p>If you didn't create an account, you can safely ignore this email.</p>
                
                <p>Happy watching!<br>The VOD Team</p>
            </div>
            <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Create message
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.from_email
    message["To"] = to_email
    
    # Attach HTML
    html_part = MIMEText(html_content, "html")
    message.attach(html_part)
    
    # Send email
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()  # Secure connection
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(message)
            print(f"✅ Verification email sent to {to_email}")
            
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")
        # In production, log this error and maybe retry
        raise


def send_password_reset_email(to_email: str, username: str, reset_token: str):
    """
    Send password reset link to user.
    
    Args:
        to_email: User's email address
        username: User's username (for personalization)
        reset_token: Password reset token
    """
    
    # Create reset link
    reset_link = f"{settings.frontend_url}/reset-password?token={reset_token}"
    
    # Email content
    subject = "Reset Your Password - VOD Platform"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
                      color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 15px 30px; background: #f5576c; 
                      color: white; text-decoration: none; border-radius: 5px; 
                      font-weight: bold; margin: 20px 0; }}
            .button:hover {{ background: #e04658; }}
            .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; 
                       margin: 20px 0; border-radius: 5px; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔒 Reset Your Password</h1>
            </div>
            <div class="content">
                <p>Hi <strong>{username}</strong>,</p>
                
                <p>We received a request to reset your password for your VOD Platform account.</p>
                
                <p>Click the button below to set a new password:</p>
                
                <div style="text-align: center;">
                    <a href="{reset_link}" class="button">
                        Reset Password
                    </a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="background: #e9e9e9; padding: 10px; border-radius: 5px; word-break: break-all;">
                    {reset_link}
                </p>
                
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong>
                    <ul style="margin: 10px 0;">
                        <li>This link expires in <strong>1 hour</strong></li>
                        <li>For security, you'll be logged out from all devices after reset</li>
                        <li>If you didn't request this, ignore this email - your password is safe</li>
                    </ul>
                </div>
                
                <p>Thanks,<br>The VOD Team</p>
            </div>
            <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
                <p>If you didn't request a password reset, please ignore this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Create message
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.from_email
    message["To"] = to_email
    
    # Attach HTML
    html_part = MIMEText(html_content, "html")
    message.attach(html_part)
    
    # Send email
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(message)
            print(f"✅ Password reset email sent to {to_email}")
            
    except Exception as e:
        print(f"❌ Failed to send password reset email to {to_email}: {e}")
        raise
