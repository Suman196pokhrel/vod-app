# API Reference

Base URL: `http://localhost` (through Caddy) or `http://localhost:8000` (direct)
Swagger UI: `http://localhost/docs`

All protected endpoints require: `Authorization: Bearer <access_token>`

---

## Auth — `/auth`

### POST /auth/signup
Register a new user. Does not auto-login — user must verify email first.

**Request:**
```json
{ "email": "user@example.com", "username": "alice", "password": "secret123" }
```

**Response:** `UserResponse` — user object without password

---

### POST /auth/signin
Login with email and password.

**Request:**
```json
{ "email": "user@example.com", "password": "secret123" }
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "...", "email": "...", "username": "...", "role": "user", "is_verified": true }
}
```

Returns 401 if credentials invalid or email unverified.

---

### POST /auth/refresh
Rotate access token using a valid refresh token.

**Request:**
```json
{ "refresh_token": "eyJ..." }
```

**Response:**
```json
{ "access_token": "eyJ..." }
```

---

### POST /auth/logout
Revoke refresh token (marks it as revoked in DB).

**Request:**
```json
{ "refresh_token": "eyJ..." }
```

**Response:** `{ "message": "Logged out successfully" }`

---

### GET /auth/verify-email?token={token}
Verify email address from link in verification email.

**Query param:** `token` — UUID token from email link

**Response:** Success or error message

---

### POST /auth/resend-verification
Resend verification email. Rate-limited: max 3 per hour.

**Request:**
```json
{ "email": "user@example.com" }
```

---

### POST /auth/forgot-password
Send a 6-digit OTP to the user's email for password reset. Rate-limited: max 3 per hour.

**Request:**
```json
{ "email": "user@example.com" }
```

---

### POST /auth/reset-password
Reset password using email + OTP code. Invalidates all existing refresh tokens (logs out all devices).

**Request:**
```json
{ "email": "user@example.com", "code": "123456", "new_password": "newpass123" }
```

---

## Videos — `/videos`

### POST /videos/create
Upload a video. Requires authentication (any verified user).

**Request:** `multipart/form-data`
- `video` (file, required) — MP4/MOV/AVI/MKV, max ~5 GB
- `thumbnail` (file, optional) — JPEG/PNG/WebP
- `data` (string, required) — JSON-encoded metadata:

```json
{
  "title": "My Video",
  "description": "A great video.",
  "category": "drama",
  "ageRating": "PG-13",
  "director": "Jane Doe",
  "cast": "Actor A, Actor B",
  "releaseDate": "2024-01-15",
  "status": "draft",
  "tags": ["action", "thriller"]
}
```

**Response:** `VideoResponse` — created video object with `id` (use for status polling)

**Side effects:** Dispatches Celery processing pipeline immediately.

---

### GET /videos/by-id/{video_id}
Get a single video by ID. Public endpoint (no auth required if video is public).

**Response:** `VideoResponse`

---

### GET /videos/
Get all public published videos. Paginated.

**Query params:** `skip` (default 0), `limit` (default 20)

**Response:** `{ items: VideoResponse[], total, skip, limit, has_more }`

---

### GET /videos/user/me _(auth required)_
Get current user's videos.

**Query params:** `skip`, `limit`

---

### DELETE /videos/by-id/{video_id} _(auth required)_
Delete a video. Owner only.

**Note:** There is a bug in this endpoint — it references `video.video_url` which doesn't exist on the model. Should be `video.raw_video_path`. The endpoint will throw a 500 if called.

---

### POST /videos/{video_id}/view
Increment view count.

**Response:** `{ "message": "View recorded" }`

---

### GET /videos/{video_id}/status _(auth required)_
Get processing status. Used by frontend to poll during upload.

**Response:**
```json
{
  "video_id": "abc123",
  "status": "transcoding",
  "progress": 50,
  "message": "Transcoding video...",
  "error": null,
  "is_completed": false,
  "is_failed": false
}
```

`progress` is an integer 0–100 derived from status string.

---

### GET /videos/list-all _(admin only)_
Full video list for admin panel with filtering, sorting, search, and pagination.

**Query params:**
- `skip`, `limit`
- `status` — filter by publishing status (draft/published/scheduled)
- `processing_status` — filter by pipeline status
- `search` — search in title
- `user_id` — filter by uploader
- `sort_by` — field to sort by
- `sort_order` — asc/desc

**Response:** `{ items: VideoResponse[], total, skip, limit, has_more }`

---

## User — `/user`

### GET /user/profile _(auth required)_
Get current authenticated user's profile.

**Response:**
```json
{ "id": "...", "email": "...", "username": "...", "role": "user", "is_verified": true }
```

---

## Health — `/health`

### GET /health/
Returns `{ "status": "Ok!" }`. Used for liveness checks.

---

### GET /
Root endpoint. Returns:
```json
{
  "app": "VOD API",
  "version": "0.1.0",
  "docs": "/docs"
}
```

---

## Error Responses

All errors follow FastAPI's default format:

```json
{ "detail": "Error message or list of validation errors" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (invalid file type, duplicate email) |
| 401 | Missing or invalid token |
| 403 | Insufficient permissions (not admin, unverified email) |
| 404 | Resource not found |
| 422 | Validation error (field missing, wrong type) |
| 500 | Server error |

---

## Authentication Model

- **Access token:** HS256 JWT, 60-minute TTL. Payload: `{ user_id, email, role, exp, type: "access" }`
- **Refresh token:** HS256 JWT, 7-day TTL. Stored as SHA-256 hash in DB.
- **Logout:** Marks refresh token as revoked — access tokens remain valid until expiry (no server-side invalidation)
- **Password reset:** Invalidates all refresh tokens for the user
