# 14 — API Reference

Now that you understand the full system — infrastructure, models, auth, processing, and frontend — you have everything you need to start building. This reference is your companion when you're writing new code: a quick lookup for every API endpoint, what it expects, and what it returns.

Unlike the earlier chapters, this one is deliberately structured. You won't read it front to back so much as jump to the endpoint you're wiring up. Each entry tells you the method and path, what the endpoint does, the request and response shapes, whether you need to be authenticated, and any behavior that might surprise you.

---

## 1. Base URL and Authentication

Every route is served by FastAPI behind the Caddy proxy. In local development:

- Through Caddy: `http://localhost`
- Direct to the API container: `http://localhost:8000`

The frontend talks to whichever URL is set in `NEXT_PUBLIC_API_URL`.

Authentication uses **JWT Bearer tokens**. Once signed in, you get an `access_token` and a `refresh_token`. For any protected endpoint, send the access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

The dependency that enforces this lives in `app/core/dependencies.py`:

- `get_current_user` — requires a valid access token; raises `401` otherwise
- `get_current_admin_user` — requires a valid access token **and** admin role; raises `403` otherwise
- `get_current_user_optional` — returns the user if a valid token is present, otherwise `None`. Never raises.

Access tokens expire in 30 minutes. When one expires, the API returns `401`, and the frontend's Axios interceptor calls `POST /auth/refresh` transparently to get a new one.

> **Tip:** The Swagger UI at `/docs` lets you test every endpoint live. Click **Authorize**, paste your access token, and fire requests directly from the browser.

---

## 2. Auth Endpoints (`/auth`)

All auth routes are mounted under the `/auth` prefix. None require an existing token (they're how you *get* tokens).

### POST `/auth/signup`

Register a new user account.

- **Auth:** Not required
- **Request body:**
  ```json
  {
    "email": "user@example.com",
    "username": "someuser",
    "password": "atleast8chars"
  }
  ```
  `username` must be 3–50 characters. `password` must be 8–100 characters. Role is not accepted from the client — every new account defaults to USER.
- **Response** (`UserResponse`, status `201`): the created user object. No password ever returned.
- **Notable:** Sign-up triggers a verification email. The account exists but `is_verified` is `false` until the email link is clicked. No tokens are issued at this stage.

### POST `/auth/signin`

Log in and receive tokens.

- **Auth:** Not required
- **Request body:**
  ```json
  {
    "email": "user@example.com",
    "password": "atleast8chars"
  }
  ```
- **Response** (`TokenResponse`, status `200`):
  ```json
  {
    "access_token": "...",
    "refresh_token": "...",
    "token_type": "bearer",
    "user": { /* UserResponse */ }
  }
  ```
- **Notable:** Returns both tokens plus the embedded user object so the frontend can hydrate its auth store from a single response.

### POST `/auth/refresh`

Exchange a valid refresh token for a new access token.

- **Auth:** Not required (the refresh token is the credential)
- **Request body:**
  ```json
  { "refresh_token": "..." }
  ```
- **Response** (status `200`):
  ```json
  { "access_token": "...", "token_type": "bearer" }
  ```
- **Notable:** Only a new access token comes back — no new refresh token and no user object. The refresh token must still be valid in the database (not revoked).

### POST `/auth/logout`

Revoke a refresh token, ending that session.

- **Auth:** Not required (you pass the refresh token to revoke)
- **Request body:**
  ```json
  { "refresh_token": "..." }
  ```
- **Response:** confirmation dict, status `200`
- **Notable:** The already-issued access token remains valid until it expires on its own — logout targets the refresh token.

### GET `/auth/verify-email`

Verify a user's email address from the link in their inbox.

- **Auth:** Not required
- **Query parameter:** `token` (the UUID from the email link)
- **Example:** `GET /auth/verify-email?token=abc-uuid`
- **Response:** confirmation dict, status `200`
- **Notable:** This is a `GET` with a query parameter, not a body, because it's clicked as a link in an email. On success, `users.is_verified` flips to `true`.

### POST `/auth/resend-verification`

Resend the verification email.

- **Auth:** Not required
- **Request body:**
  ```json
  { "email": "user@example.com" }
  ```
- **Response:** confirmation dict, status `200`

### POST `/auth/forgot-password`

Start the password reset flow.

- **Auth:** Not required
- **Request body:**
  ```json
  { "email": "user@example.com" }
  ```
- **Response:** confirmation dict, status `200`
- **Notable:** Always returns `200` success even if the email doesn't exist — prevents email enumeration attacks.

### POST `/auth/reset-password`

Complete the reset using the code from the email.

- **Auth:** Not required
- **Request body:**
  ```json
  {
    "email": "user@example.com",
    "code": "123456",
    "new_password": "atleast8chars"
  }
  ```
  `code` is a 6-digit string. `new_password` is 8–100 characters.
- **Response:** confirmation dict, status `200`
- **Notable:** On success, the password is updated and the user is logged out of **all devices** (all refresh tokens revoked).

---

## 3. Video Endpoints (`/videos`)

All video routes are mounted under the `/videos` prefix.

### POST `/videos/create`

Upload a new video with metadata and optional thumbnail. **This endpoint uses `multipart/form-data`, not JSON** — see [Section 8](#8-the-multipartform-data-quirk) for the full explanation.

- **Auth:** Required
- **Form fields:**
  - `video_file` — the video file (MP4, MOV, MKV, AVI, max 5GB). Required.
  - `thumbnail` — a thumbnail image (JPEG, PNG). Optional but effectively required by the frontend.
  - `data` — a **JSON string** containing video metadata. Required.
- **The `data` field contents:**
  ```json
  {
    "title": "My Video",
    "description": "A description of at least 10 characters",
    "category": "Drama",
    "age_rating": "PG-13",
    "director": "Optional director name",
    "cast": "Actor A, Actor B",
    "release_date": "2026-01-01",
    "status": "draft",
    "tags": ["action", "thriller"]
  }
  ```
  `title` is 5–200 characters; `description` is 10–2000 characters; `category` is required.
- **Response** (`VideoResponse`, status `201`): the created video record
- **Notable:** The API stores the raw file in MinIO, creates the DB record, enqueues the Celery transcoding workflow, and returns immediately. Poll `GET /videos/{video_id}/status` for progress.

### GET `/videos/`

Public video feed.

- **Auth:** Not required
- **Query params:** `skip` (default `0`), `limit` (default `20`)
- **Response:** `List[VideoList]` — lightweight video objects for grid display

### GET `/videos/by-id/{video_id}`

Fetch a single video by ID.

- **Auth:** Optional (`get_current_user_optional` — never raises, just resolves to `None` for anonymous/invalid tokens)
- **Path param:** `video_id`
- **Response:** `VideoResponse` — the full video record.
- **Notable:** A public video is visible to anyone. A private video is visible only to its owner or an admin — any other caller, including anonymous ones, gets `404`. Deliberately not `403`: the API never confirms a private video exists to someone who isn't allowed to see it. This is also what makes the public watch page work with no sign-in required.

### GET `/videos/user/me`

List videos uploaded by the current user.

- **Auth:** Required
- **Query params:** `skip` (default `0`), `limit` (default `20`)
- **Response:** `List[VideoList]`

### DELETE `/videos/by-id/{video_id}`

Soft-delete a video.

- **Auth:** Required, **admin role**
- **Path param:** `video_id`
- **Response:** status `204`, no body
- **Notable:** This sets `deleted_at` to now and stops there — the row and every MinIO file are left untouched. Every listing/lookup path filters out rows with a non-null `deleted_at`. An earlier revision of this reference documented a crash here (`video.video_url` doesn't exist on the model); that's resolved — this endpoint never touches that field. A genuine hard-delete method exists in the service layer but isn't wired to any route.

### PATCH `/videos/by-id/{video_id}/visibility`

Flip a video between public and private.

- **Auth:** Required, **admin role**
- **Path param:** `video_id`
- **Request body:** `{ "is_public": true }`
- **Response:** `VideoResponse`, status `200`
- **Notable:** Only touches `is_public` — independent of `status` (`draft`/`published`/`scheduled`) and independent of soft delete. This is how the admin videos table's visibility toggle works; there is no equivalent control in the upload form itself.

### PATCH `/videos/by-id/{video_id}`

Partial update of a video's metadata — the admin "Edit Details" form.

- **Auth:** Required, **admin role**
- **Path param:** `video_id`
- **Request body** (all fields optional — only fields present are changed, via `exclude_unset`):
  ```json
  {
    "title": "string",
    "description": "string",
    "thumbnail_url": "string",
    "is_public": true,
    "category": "string",
    "age_rating": "string",
    "release_date": "2026-01-01",
    "director": "string",
    "cast": "Actor A, Actor B",
    "tags": ["action"],
    "status": "draft"
  }
  ```
- **Response:** `VideoResponse`, status `200`

### GET `/videos/by-id/{video_id}/download-url`

Get a short-lived, presigned download URL for the original source file.

- **Auth:** Required, **admin role**
- **Path param:** `video_id`
- **Response:** `{ "url": "https://..." }`, status `200`
- **Notable:** The URL expires in 15 minutes and has `Content-Disposition: attachment` already set, so the browser downloads the file instead of trying to play it inline — necessary because storage is served from a different origin than the app. The host/scheme used to sign the URL are read from the incoming request (Caddy forwards `Host` and sets `X-Forwarded-Proto`), so the same code signs correctly in both dev and production without hardcoding a public URL.

### POST `/videos/{video_id}/view`

Increment a video's view count.

- **Auth:** Optional (`get_current_user_optional`)
- **Path param:** `video_id`
- **Response:** `{ "message": "View count incremented" }`, status `200`
- **Notable:** Call this when playback starts. No auth needed — anonymous views count too. As of this writing, the frontend watch page doesn't actually call this endpoint yet, so views aren't being recorded in practice even though the endpoint itself works.

### GET `/videos/{video_id}/status`

Poll the processing status of a video.

- **Auth:** Required
- **Path param:** `video_id`
- **Response** (`VideoProcessingStatusResponse`):
  ```json
  {
    "video_id": "...",
    "status": "transcoding",
    "progress": 45,
    "message": "Transcoding 720p...",
    "error": null,
    "is_completed": false,
    "is_failed": false
  }
  ```
  `progress` is 0–100. `is_completed` and `is_failed` are convenience booleans so you don't have to string-match on `status`.

### GET `/videos/list-all` (admin only)

Full video listing with filtering, sorting, and pagination for the admin panel.

- **Auth:** Required, **admin role**
- **Query parameters:**

  | Param | Default | Notes |
  |-------|---------|-------|
  | `skip` | `0` | offset, >= 0 |
  | `limit` | `20` | page size, 1–100 |
  | `status` | — | filter: `draft`, `published`, `archived` |
  | `processing_status` | — | filter by processing stage |
  | `search` | — | matches title or description |
  | `user_id` | — | filter by uploader |
  | `sort_by` | `created_at` | field to sort by |
  | `sort_order` | `desc` | `asc` or `desc` |

- **Response** (`PaginatedResponse`):
  ```json
  {
    "items": [ /* AdminVideoList[] */ ],
    "total": 137,
    "skip": 0,
    "limit": 20
  }
  ```
- **Notable:** Returns admin-only details hidden from public schemas — processing status, errors, Celery task ID, private videos, manifest URLs. Non-admins get a `403`.

---

## 4. User Endpoints (`/user`)

The user router is mounted under the `/user` prefix (singular, not `/users`).

### GET `/user/profile`

Return the profile of the currently authenticated user.

- **Auth:** Required
- **Response** (`UserResponse`, status `200`): the current user's record
- **Notable:** A "who am I" endpoint for the frontend to confirm session state and rehydrate user info. Use this on app startup after reading a token from localStorage.

---

## 5. Health Endpoint (`/health`)

### GET `/health/`

Liveness check.

- **Auth:** Not required
- **Response:** `{ "status": "Ok!" }`
- **Notable:** Only confirms the API process is alive — no database or Redis health checks. Useful for uptime monitors and load balancers, but won't tell you if Postgres is down.

---

## 6. Common Response Schemas

### `UserResponse`

```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "username": "someuser",
  "role": "USER",
  "is_active": true,
  "is_verified": true,
  "created_at": "2026-06-18T12:00:00Z",
  "updated_at": "2026-06-18T12:00:00Z"
}
```

`hashed_password` is never included in any response. `role` is either `USER` or `ADMIN`.

### `VideoResponse`

```json
{
  "id": "uuid-string",
  "title": "string",
  "description": "string",
  "category": "string",
  "raw_video_path": "user-abc/uuid.mp4",
  "thumbnail_url": "user-abc/thumb.jpg",
  "manifest_url": "video-id/segments/master.m3u8",
  "available_qualities": ["1080p", "720p", "480p"],
  "age_rating": "PG-13",
  "release_date": "2026-01-01",
  "director": "string",
  "cast": ["Actor A", "Actor B"],
  "tags": ["action"],
  "views_count": 0,
  "is_public": true,
  "status": "published",
  "processing_status": "completed",
  "created_at": "2026-06-18T12:00:00Z",
  "user_id": "uuid-string"
}
```

Storage paths (`raw_video_path`, `thumbnail_url`, `manifest_url`) are MinIO object names, not full URLs. The frontend needs to prepend the MinIO endpoint to construct playable URLs.

### `VideoProcessingStatusResponse`

```json
{
  "video_id": "uuid-string",
  "status": "transcoding",
  "progress": 45,
  "message": "Transcoding 720p...",
  "error": null,
  "is_completed": false,
  "is_failed": false
}
```

### `PaginatedResponse`

```json
{
  "items": [],
  "total": 0,
  "skip": 0,
  "limit": 20
}
```

---

## 7. Error Responses

All errors follow FastAPI's standard format: `{ "detail": "..." }`.

| Code | Meaning in This System |
|------|----------------------|
| `401` | Invalid or expired access token. Triggers the frontend's auto-refresh flow. |
| `403` | Authenticated but not authorized — either not an admin, or account not verified. |
| `404` | Resource doesn't exist (video_id not found, token not found, etc.). |
| `422` | Request validation failed — missing required field, value out of range, invalid format. Pydantic lists exactly which field and why. |
| `500` | Server error — often a bug. Check `make logs s=api` for the traceback. |

Mental model: `401` = "I don't know who you are," `403` = "I know who you are but you can't," `404` = "not here," `422` = "your request was malformed."

---

## 8. The `multipart/form-data` Quirk

The `POST /videos/create` endpoint has one design decision that trips everyone up: the metadata is sent as a JSON **string** inside a form field, not as a JSON request body.

The endpoint signature:
```python
async def create_new_video(
    video_file: UploadFile = File(...),
    thumbnail: Optional[UploadFile] = File(None),
    data: str = Form(...),    # ← a string, not a Pydantic model
)
```

The reason: HTTP multipart lets you send binary files alongside text fields, but there's no clean standard for mixing a file with a nested JSON object. The `data` field workaround — stringified JSON inside a form text field — is the practical solution.

**curl:**
```bash
curl -X POST http://localhost/videos/create \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "video_file=@/path/to/movie.mp4" \
  -F "thumbnail=@/path/to/thumb.jpg" \
  -F 'data={"title":"My Video","description":"A long description here","category":"Drama","status":"draft","tags":["drama"]}'
```

**JavaScript (the frontend pattern):**
```typescript
const metadata = {
  title: "My Video",
  description: "A long description here",
  category: "Drama",
  status: "draft",
  tags: ["drama"],
}

const form = new FormData()
form.append("video_file", videoFile)
form.append("thumbnail", thumbnailFile)
form.append("data", JSON.stringify(metadata))   // ← must stringify

// Don't set Content-Type manually — the browser sets multipart/form-data
// with the correct boundary automatically when the body is FormData
const response = await apiClient.post("/videos/create", form)
```

Two things to remember:
1. **Call `JSON.stringify`** on the metadata before appending to `data`
2. **Don't set `Content-Type: application/json`** — let the browser/Axios handle the multipart boundary

---

## That's It

You've now read through the complete documentation for this platform. You know how it's built, why each piece is the way it is, and exactly what needs to be done next. The bugs are documented, the roadmap is clear, and the codebase is waiting. Happy building.
