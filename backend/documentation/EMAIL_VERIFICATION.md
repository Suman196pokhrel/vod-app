# Email Verification System

## Overview

The VOD platform uses email verification to ensure users have valid email addresses during signup. Users must verify their email before they can log in.

---

## How It Works

```
1. User signs up → Account created (is_verified = false)
2. System sends verification email with unique token
3. User clicks link in email
4. Token verified → Account activated (is_verified = true)
5. User can now log in
```

**Security Features:**
- ✅ Tokens expire after 24 hours
- ✅ Tokens are single-use (marked as "used" after verification)
- ✅ Unverified users cannot log in
- ✅ Rate limiting: Max 3 emails per hour per user

---

## Database Schema

### `email_verification_tokens` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users table |
| `token` | UUID | Unique verification token |
| `expires_at` | Timestamp | Token expiration (24 hours) |
| `used` | Boolean | Whether token has been used |
| `created_at` | Timestamp | When token was created |

### `users` Table Update

- `is_verified` (Boolean): `false` by default, set to `true` after verification

---

## Configuration

### Environment Variables

Add these to your `backend/.env` file:

```bash
# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com           # Your Gmail address
SMTP_PASSWORD=your-app-password          # 16-character App Password
FROM_EMAIL=your-email@gmail.com          # Sender email
FRONTEND_URL=http://localhost:3000       # Your frontend URL
```

### Gmail Setup (Required)

1. **Enable 2-Factor Authentication:**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select App: Mail
   - Select Device: Other (Custom name)
   - Name it: "VOD Platform"
   - Copy the 16-character password
   - Add to `.env` as `SMTP_PASSWORD`

---

## API Endpoints

### 1. Signup (Sends Verification Email)

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "is_verified": false,  // Not verified yet
  "role": "user",
  ...
}
```

**Side Effect:** Verification email sent to user's inbox

---

### 2. Verify Email

```http
GET /api/auth/verify-email?token={token-from-email}
```

**Response:** `200 OK`
```json
{
  "message": "Email verified successfully! You can now login.",
  "already_verified": false
}
```

**Side Effect:** `is_verified` set to `true`, token marked as `used`

---

### 3. Resend Verification Email

```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "Verification email sent. Please check your inbox."
}
```

**Rate Limit:** Max 3 emails per hour per user

---

### 4. Login (Requires Verification)

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**If NOT verified:** `403 Forbidden`
```json
{
  "detail": "Please verify your email before logging in. Check your inbox."
}
```

**If verified:** `200 OK` + tokens

---

## Email Template

The verification email includes:

- **Personalized greeting** with username
- **Verification button** (primary CTA)
- **Plain text link** (backup if button doesn't work)
- **Expiration notice** (24 hours)
- **Professional styling** with gradient header

**Example:**
```
Subject: Verify Your Email - VOD Platform

Welcome to VOD Platform! 🎬

Hi johndoe,

Thanks for signing up! Please verify your email by clicking:

[Verify Email Address]  ← Button

Or copy this link:
http://localhost:3000/verify-email?token=abc-123-xyz

This link expires in 24 hours.
```

---

## Testing

### Test Flow

1. **Signup**
   ```bash
   curl -X POST http://localhost:8000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@gmail.com",
       "username": "testuser",
       "password": "TestPass123"
     }'
   ```

2. **Check Email Inbox**
   - Look for email from your configured `FROM_EMAIL`
   - Copy the verification token from the link

3. **Verify Email**
   ```bash
   curl http://localhost:8000/api/auth/verify-email?token={your-token}
   ```

4. **Login**
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@gmail.com",
       "password": "TestPass123"
     }'
   ```
   Should now work! ✅

### Console-Only Testing (No Email)

For testing without email setup, modify `app/services/email_service.py`:

```python
def send_verification_email(to_email, username, token):
    link = f"http://localhost:3000/verify-email?token={token}"
    print(f"\n📧 VERIFICATION LINK: {link}\n")
    # Comment out SMTP code
```

Copy the link from console output.

---

## File Structure

```
backend/
├── app/
│   ├── models/
│   │   ├── email_verification.py      # EmailVerificationToken model
│   │   └── users.py                   # User model (is_verified field)
│   ├── schemas/
│   │   └── user.py                    # ResendVerificationRequest schema
│   ├── services/
│   │   ├── auth_service.py            # Updated: sends email on signup
│   │   ├── email_service.py           # Email sending logic
│   │   └── verification_service.py    # Verification business logic
│   └── apis/
│       └── routes/
│           └── auth.py                # Verification endpoints
├── alembic/
│   └── versions/
│       └── xxxxx_add_email_verification.py  # Migration file
└── .env                               # Email configuration
```

---

## Troubleshooting

### Email Not Sending

**Symptoms:** Signup works but no email received

**Solutions:**

1. **Check Console Output:**
   ```
   ✅ Verification email sent to user@example.com  ← Success
   ❌ Failed to send email: [error]                ← Failed
   ```

2. **Verify SMTP Credentials:**
   - Double-check `SMTP_USER` and `SMTP_PASSWORD` in `.env`
   - Ensure you're using App Password (not regular Gmail password)

3. **Check Spam Folder:**
   - Emails from Gmail to Gmail often go to spam during testing

4. **Test SMTP Connection:**
   ```bash
   telnet smtp.gmail.com 587
   # Should connect successfully
   ```

5. **Check 2FA is Enabled:**
   - Gmail requires 2-Factor Authentication for App Passwords

---

### Token Not Found

**Symptoms:** `400 Bad Request - Invalid verification token`

**Causes:**
- Token expired (24 hours passed)
- Token already used
- Token doesn't exist in database

**Solution:**
```bash
# Resend verification email
curl -X POST http://localhost:8000/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

---

### Migration Issues

**Symptoms:** `relation "email_verification_tokens" does not exist`

**Solution:**
```bash
cd backend
alembic upgrade head
```

---

### Already Verified Error

**Symptoms:** `400 Bad Request - Email already verified`

**This is correct behavior!** User is already verified and can log in.

---

## Production Considerations

### Use Professional Email Service

For production, replace Gmail SMTP with:

**Recommended Services:**
- **SendGrid** (12,000 free emails/month)
- **AWS SES** (Pay as you go, very cheap)
- **Mailgun** (Good for transactional emails)
- **Postmark** (High deliverability)

**Why?**
- Better deliverability (won't go to spam)
- Higher sending limits
- Email analytics and tracking
- Better reputation management

### SendGrid Example

```bash
# .env (Production)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Security Best Practices

1. **Never commit `.env` file** to Git
2. **Use environment secrets** in production (AWS Secrets, Heroku Config Vars)
3. **Implement rate limiting** on verification endpoints
4. **Monitor email delivery** failures and retry
5. **Set up SPF/DKIM records** for your domain
6. **Use HTTPS** for verification links in production

### Monitoring

Track these metrics:
- Email delivery success rate
- Token usage rate
- Expired tokens count
- Resend requests per user

---

## Alternative: Mailtrap (Testing)

For development without Gmail setup, use Mailtrap:

1. Sign up: https://mailtrap.io (free)
2. Get credentials from inbox settings
3. Update `.env`:
   ```bash
   SMTP_HOST=sandbox.smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=your-mailtrap-username
   SMTP_PASSWORD=your-mailtrap-password
   FROM_EMAIL=noreply@vodplatform.com  # Can be anything
   ```
4. All emails appear in Mailtrap web interface

**Benefits:**
- No Gmail setup needed
- No emails actually sent
- See exactly what users receive
- Test spam filters
- Perfect for development

---

## Future Enhancements

Potential improvements:

- [ ] Email templates with better branding
- [ ] Welcome email after verification
- [ ] Password reset via email
- [ ] Email change verification
- [ ] Notification emails (new video, comments)
- [ ] Customizable email templates per user preference
- [ ] Email queue for better performance (Celery + Redis)

---

## Support

**Common Questions:**

**Q: How long are tokens valid?**  
A: 24 hours from creation

**Q: Can users resend verification emails?**  
A: Yes, max 3 times per hour per user

**Q: What if user never verifies?**  
A: Account exists but cannot log in. Consider cleanup job to delete unverified accounts after 30 days.

**Q: Can admin verify users manually?**  
A: Not implemented yet, but you can manually update `is_verified = true` in database

**Q: Do verification emails work offline?**  
A: No, requires internet connection to send emails via SMTP

---

## License

Part of the VOD Platform project.

**Last Updated:** November 2024  
**Version:** 1.0