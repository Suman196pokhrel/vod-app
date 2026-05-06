# Project Status

Assessment as of May 2026. This is an early-stage project — backend is production-grade, frontend is partially complete.

---

## Overall Assessment

```
Backend pipeline:     ████████████████████ 95% — feature complete, one bug
Authentication:       ████████████████████ 100% — complete
Frontend auth:        ████████████████████ 100% — complete
Frontend upload:      ████████████████░░░░ 80% — functional, minor gaps
Admin panel:          ████████████░░░░░░░░ 60% — structure done, data wired partially
Home feed:            ████░░░░░░░░░░░░░░░░ 20% — stubbed with mock data
Video player:         ██░░░░░░░░░░░░░░░░░░ 10% — UI shell only, no streaming
AI features:          ██░░░░░░░░░░░░░░░░░░ 10% — static UI, no backend
```

---

## What's Complete

### Backend
- FastAPI app structure with CORS, lifespan, router registration
- Full auth system: signup, signin, JWT access/refresh tokens, logout, email verification, password reset with OTP
- Refresh token rotation with revocation on logout
- bcrypt password hashing, SHA-256 token hashing in DB
- Video upload endpoint: MIME validation, MinIO upload, DB record creation, rollback on failure
- Complete Celery processing pipeline: prepare → transcode (parallel chord, 7 qualities) → HLS segmentation → master playlist → MinIO upload → finalize
- Video status API for frontend polling
- Admin video list with filtering, sorting, search, pagination
- View count increment endpoint
- MinIO service with auto-bucket creation, presigned URLs
- FFmpeg service (FFprobe metadata extraction)
- Email service (Resend integration for verification + password reset emails)
- Rate limiting on resend-verification and forgot-password (3/hour)
- Alembic migrations (5 migration files)

### Frontend
- Auth: sign-in, sign-up, email verification, forgot password, reset password
- Zustand auth store with localStorage token management
- Axios interceptor for auto token refresh on 401
- Protected route guard (redirects unauthenticated users)
- Video upload form: file dropzone, Zod validation, all metadata fields
- `POST /videos/create` integration
- Video processing status dialog with 7-phase animation
- Status polling hook (`useVideoProcessing`)
- Admin video list table
- Admin dashboard layout

---

## Half-Finished Features

### Draft Saving
**File:** `app/(protected)/admin/videos/upload/page.tsx:130`
```typescript
// TODO: Implement actual draft saving API call
await new Promise((r) => setTimeout(r, 1000)); // fake delay
```
The backend `POST /videos/draft` endpoint exists in `lib/apis/video.ts` but is not called. The button shows a spinner for 1 second then reports success.

### Upload Progress Bar
**File:** `app/(protected)/admin/videos/_components/VideoUploadZone.tsx:79-87`
Code for an `onUploadProgress` Axios callback is commented out. The file is selected and the POST fires, but no progress is shown during the upload itself.

### Processing Retry
**File:** `video-processing-dialog.tsx:169-178`
A "Retry" button renders in the error state but the `onRetry` prop is not wired in the parent page. Clicking it does nothing.

### Home Feed
**File:** `app/(protected)/home/page.tsx`
Nearly the entire page is commented out. Only `VideoGrid` renders, and it shows 1 hardcoded Stranger Things mock. None of these components are connected to the API:
- `HeroSection`, `CategoryPills`, `AIWatchTimeBanner`, `MoodSelector`
- `ContinueWatching`, `Top10ThisWeek`, `PersonalizedRow`
- `ContentJourney`, `QuickAccessSidebar`, `SmartQueue`

### Admin Analytics
`/admin/analytics` page exists with `RealtimeStats`, `ViewsCharts`, `CategoryPerformance`, `TopVideosTable` components, but they appear to render static/mock data — no backend analytics endpoints exist.

### Admin Categories
`/admin/categories` exists with `CategoryCard`, `CategoryDialog` components. No categories API endpoint exists on the backend.

### Admin Users
`/admin/users` page has `StatsCards` component. No users list API endpoint exists.

### Admin Settings
`/admin/settings` — page file exists but appears to be a shell.

---

## Dead Code / Bugs

### Bug — delete_video endpoint
**File:** `backend/app/services/video_service.py:389`
```python
minio_service.delete_video(video.video_url)  # AttributeError: 'Video' has no attribute 'video_url'
```
Should be `video.raw_video_path`. Calling `DELETE /videos/by-id/{id}` will crash with a 500 error.

### Duplicate Function Definition
**File:** `backend/app/services/video_service.py`
`_validate_video_file()` is defined twice (around lines 246 and 409). Python uses the second definition; the first is dead code.

### Legacy create_video() Function
**File:** `backend/app/services/video_service.py:522`
```python
def create_video(db, video_data: VideoCreate, user_id: str):
    """Legacy function - creates video with URLs already provided"""
```
Not called anywhere in the current codebase. Uses a `VideoCreate` schema with a `video_url` field that doesn't match the current model. Safe to delete.

### Empty Zustand Stores
**Files:** `lib/store/videoStore.ts`, `lib/store/userStore.ts` — both contain only 1 line (export statement). All video state that would normally go here is handled inline in components.

### TanStack Query — Not Used
The `QueryClientProvider` is wired and `ReactQueryDevtools` is loaded, but no `useQuery` or `useMutation` calls exist in any page or component. All API calls use raw Axios in Zustand actions or `useEffect` hooks.

### Google OAuth — UI Only
Sign-in and sign-up forms render a "Continue with Google" button with no `onClick` handler. No OAuth flow or backend Google auth endpoint exists.

### AI Feature Components — All Static
Every AI component renders hardcoded data:
- `AISceneTimeline`: 6 hardcoded scene objects
- `AIMoodAnalysis`: hardcoded percentages (`Suspense: 85%, Drama: 72%...`)
- `AIRecommendations`, `AIWatchParty`, `AIContentWarnings`: no visible implementation

---

## Missing for Production Readiness

### Security
- [ ] Rotate all secrets from `.env.example` defaults (`change-me-in-prod`, `minioadmin123`)
- [ ] Set `minio_secure=true` and point at HTTPS MinIO or real S3
- [ ] Fix staging Docker compose: don't expose postgres/redis on `0.0.0.0`
- [ ] Add rate limiting on video upload endpoint (prevents storage abuse)
- [ ] Turn off `DEBUG=true` and `echo=True` on SQLAlchemy engine in prod
- [ ] Access token logout gap: tokens stay valid until expiry even after logout. Add a token denylist (Redis) or shorten TTL significantly.

### Operations
- [ ] Add Docker health checks for postgres, api, worker, minio
- [ ] Wire `depends_on: condition: service_healthy` so services wait for readiness
- [ ] Add resource limits (`mem_limit`, `cpus`) to all containers
- [ ] Configure log rotation (`logging.driver: json-file, max-size: 10m, max-file: 3`)
- [ ] Pin `minio/minio:latest` to a specific version
- [ ] Fix hardcoded Redis password in health check command
- [ ] Use Alembic `upgrade head` in prod instead of `create_all()` on startup
- [ ] Add `RESEND_API_KEY` real key + verify sender domain

### Frontend
- [ ] Implement HLS.js player — replace mock VideoPlayer with real streaming
- [ ] Wire home feed VideoGrid to `GET /videos/` API
- [ ] Implement draft saving (`POST /videos/draft`)
- [ ] Connect remaining admin pages (analytics, categories, users) to backend or build endpoints
- [ ] Remove or gate dev-only components (`MockDataBanner`, `DevModeBadge`, `DemoWatermark`) with `process.env.NODE_ENV`
- [ ] Use TanStack Query for video list queries (cache, optimistic updates, invalidation on upload)
- [ ] Populate `videoStore` and `userStore` with actual state

### Backend
- [ ] Fix `delete_video` bug (`video_url` → `raw_video_path`)
- [ ] Remove `create_video()` legacy function and unused `VideoCreate.video_url` field
- [ ] Deduplicate `_validate_video_file()` 
- [ ] Add `GET /admin/users` endpoint
- [ ] Add categories CRUD endpoints
- [ ] Add analytics endpoints
- [ ] Standardize processing_status strings to a proper Enum (currently mixed case: "failed" vs "Failed")

### Testing
- [ ] No test files exist anywhere in the codebase. Minimum needed:
  - Auth endpoint integration tests
  - Upload pipeline unit tests (mock MinIO + Celery)
  - Celery task unit tests for FFmpeg service
