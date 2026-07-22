# 04 — Authentication System

The database gives us the structure to store users and their sessions. Now let's walk through the authentication system — one of the most complete and production-grade parts of this codebase. Understanding how auth works end-to-end will help you extend it and debug it confidently.

---

## The Two-Token System

Before looking at any endpoint, understand the core design: we use **two types of JWT tokens**.

**Access token** — short-lived (30 minutes), stateless. Attached as `Authorization: Bearer <token>` to every API request. The server validates it by checking the cryptographic signature — no database lookup required. This is fast. The payload contains: `user_id`, `email`, and `role`.

**Refresh token** — long-lived (7 days), stored in the database (as a hash). Used only to get a new access token when the old one expires. Because it's in the database, we can revoke it (logout). The `refresh_tokens` table is what makes "logout from all devices" possible.

Why two tokens? A single long-lived token creates a security problem — if stolen, it works for days. A single short-lived token creates a UX problem — users have to log in every 30 minutes. Two tokens give you the best of both: short windows for access tokens (limiting damage from theft) and persistent sessions for users (they stay logged in for a week without re-entering their password).

---

## Why JWT and Not Sessions?

Traditional sessions store state on the server (in Redis or a database) and give the client a session ID. JWTs are stateless — the token itself contains the user's identity, signed so it can't be forged.

For this platform, JWT made sense for several reasons:
- The API and frontend are separate (CORS requests); cookies work but need extra configuration
- The Celery worker also needs to understand user identity in some contexts — a stateless token is easier to pass around
- FastAPI's dependency injection system integrates cleanly with JWT header parsing

The tradeoff: stateless access tokens can't be revoked before they expire. A user who is banned still has a valid access token for up to 30 minutes. This is an acceptable tradeoff at this scale — and the 30-minute expiry limits the damage window.

---

## Sign-Up Flow

**Endpoint:** `POST /auth/signup`  
**Handler:** `app/apis/routes/auth.py` → `app/services/user_service.py` (the `create_user` function lives here, not in `auth_service.py`)

1. Receives: `{email, username, password}`
2. Validates uniqueness of email and username — a database `IntegrityError` is caught and returned as a 400
3. Hashes the password with bcrypt (using `passlib`)
4. Creates the user with `is_verified = False`
5. Generates a UUID verification token, stores it in `email_verification_tokens`
6. Sends a verification email via the Resend API (if the API key fails, the error is logged but sign-up still succeeds)
7. Returns the created user — **no tokens** are issued yet. The user must verify their email before logging in.

---

## Email Verification Flow

After sign-up, the user receives an email with a link like:
```
http://localhost:3000/auth/verify-email?token=<uuid>
```

**Endpoint:** `GET /auth/verify-email?token=<token>`

The server:
1. Looks up the token in `email_verification_tokens`
2. Checks it's not expired and not already used
3. Sets `users.is_verified = True`
4. Marks the token as used
5. Returns success

If the user never received the email, they can request a new one:

**Endpoint:** `POST /auth/resend-verification`  
Rate-limited to prevent abuse (a few requests per hour per email). If the email doesn't exist, the server still returns success (prevents email enumeration).

---

## Sign-In Flow

**Endpoint:** `POST /auth/signin`  
**Handler:** `authenticate_user()` in `app/services/auth_service.py`

1. Receives: `{email, password}`
2. Finds user by email — returns 401 if not found (same error as wrong password, prevents username enumeration)
3. Verifies password with `bcrypt.checkpw()` — returns 401 on mismatch
4. Checks `is_verified` — returns 403 with "Please verify your email" if False
5. Checks `is_active` — returns 403 if the account is suspended
6. Creates an **access token** (JWT, 30 min expiry) with payload `{user_id, email, role}`
7. Creates a **refresh token** (JWT, 7 day expiry), hashes it with SHA256, stores the hash in `refresh_tokens`
8. Returns: `{access_token, refresh_token, token_type: "bearer", user: {...}}`

The frontend receives both tokens and stores them in localStorage via `tokenManager`.

---

## Token Refresh Flow

Access tokens expire in 30 minutes. Rather than log the user out, the frontend automatically refreshes them.

**Endpoint:** `POST /auth/refresh`  
**Handler:** `refresh_access_token()` in `app/services/auth_service.py`

1. Receives the refresh token from the client
2. Decodes and validates the JWT signature
3. Hashes the token with SHA256, looks it up in `refresh_tokens`
4. Checks: record exists, `is_revoked = False`, `expires_at` hasn't passed (double-check beyond JWT expiry)
5. Verifies the user is still active
6. Issues a new access token and returns it

The refresh token itself is **not rotated** — the same one stays valid for its full 7-day life. Token rotation (issuing a new refresh token on each use) would be more secure but adds complexity. It's listed in Future Upgrades.

---

## Logout Flow

**Endpoint:** `POST /auth/logout`  
**Handler:** `revoke_refresh_token()` in `app/services/auth_service.py`

1. Decodes the refresh token to get `user_id`
2. Hashes it, finds the record in `refresh_tokens`
3. Sets `is_revoked = True`
4. Returns success — even if the token isn't found (idempotent: logging out twice is harmless)

This is a single-session logout. The access token remains valid for up to 30 more minutes — but since it's short-lived, this is acceptable. A "logout from all devices" feature would set `is_revoked = True` on ALL refresh tokens for the user.

---

## Protecting Routes: FastAPI Dependencies

Any endpoint that needs authentication uses FastAPI's `Depends()` system:

```python
@video_router.post("/create")
async def create_video(
    current_user: User = Depends(get_current_user),  # requires auth
    db: Session = Depends(get_db)
):
    ...
```

`get_current_user` (defined in `core/dependencies.py`) reads the `Authorization: Bearer <token>` header, decodes the JWT, validates it, and fetches the user from the database.

`get_current_admin_user` extends this by calling `current_user.is_admin()` and raising 403 if it returns `False`. Every admin-only video endpoint (delete, visibility toggle, edit details, download URL, `list-all`) depends on this — it's the single choke point for admin authorization on the video surface. There is currently no equivalent for user management, because no admin user-management endpoints exist yet (see [13_KNOWN_BUGS_AND_NEXT_STEPS.md](./13_KNOWN_BUGS_AND_NEXT_STEPS.md)).

There's also `get_current_user_optional`, which returns the user if a valid token is present and `None` otherwise — it never raises. This is the dependency that makes the public browse/watch experience possible: `GET /videos/by-id/{video_id}` uses it to decide whether a private video's owner is asking (200) or a stranger is (404, not 403 — see [05_VIDEO_UPLOAD.md](./05_VIDEO_UPLOAD.md)), and `POST /videos/{id}/view` uses it to let anonymous viewers count as views without requiring sign-in.

---

## Password Reset Flow

**Endpoint 1:** `POST /auth/forgot-password`

Receives an email address. For security, **always returns 200 success** even if the email doesn't exist — this prevents an attacker from checking whether emails are registered (email enumeration attack).

Behind the scenes: if the email exists, generates a token, stores it in `password_reset_tokens`, and sends a reset email.

**Endpoint 2:** `POST /auth/reset-password`

Receives: `{email, code, new_password}`

1. Finds the user by email
2. Looks up the token in `password_reset_tokens`, verifies it's valid, not expired, not used
3. Hashes the new password, updates `users.hashed_password`
4. Marks the reset token as used
5. **Revokes all refresh tokens for this user** — this logs them out of all devices, since someone who needed a password reset may have had their account compromised

---

## Security Notes

- Passwords: bcrypt with default work factor (12 rounds) — slow enough to resist brute force
- Tokens: SHA256 hashes stored in DB, never the raw JWT
- Email enumeration: forgot-password always returns 200
- Rate limiting: resend-verification and forgot-password are rate-limited. Sign-in and sign-up currently are not (future improvement).
- Token storage: localStorage on the frontend. More accessible than httpOnly cookies (XSS risk), but simpler to implement. See Known Issues for the full trade-off.

---

## Future Upgrades

- **Refresh token rotation** — issue a new refresh token on each refresh, invalidate the old one. Reduces the window of risk if a refresh token is stolen.
- **httpOnly cookies** — move token storage from localStorage to httpOnly cookies to prevent XSS-based token theft. Requires backend changes to set cookies in the response.
- **Google OAuth** — the "Continue with Google" button was removed entirely during the auth-screens redesign; there's no placeholder left to wire up. Adding it back requires a Google Cloud project, OAuth credentials, a backend callback endpoint, and frontend redirect logic, plus a UI decision on where the button goes in the new design system.
- **Rate limiting on sign-in** — prevent credential stuffing attacks
- **Multi-factor authentication** — TOTP (Google Authenticator) as a second factor

---

## What's Next

With users able to sign up, verify their email, and log in, the next piece is giving them something to do: upload a video. The next document covers the entire video upload flow — from the API endpoint to the file sitting in MinIO.
