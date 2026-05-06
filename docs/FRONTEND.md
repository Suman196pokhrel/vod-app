# Frontend

> **New here?** Read [CODEBASE_WALKTHROUGH.md](./CODEBASE_WALKTHROUGH.md) chapters 17–24 for a plain-language walkthrough of every frontend decision. This document is the reference summary.

Next.js 16 with App Router, React 19, TypeScript, Tailwind CSS 4.

## Route Map

```
app/
├── (public)/                         # No auth required
│   ├── page.tsx                      # / — Landing page
│   └── auth/
│       ├── sign-in/page.tsx          # /auth/sign-in
│       ├── sign-up/page.tsx          # /auth/sign-up
│       ├── forgot-pw/page.tsx        # /auth/forgot-pw
│       └── reset-password/page.tsx   # /auth/reset-password
│   verify-email/page.tsx             # /verify-email (token in query param)
│
└── (protected)/                      # Auth-guarded (layout.tsx redirects to sign-in)
    ├── home/
    │   ├── page.tsx                  # /home — main feed (STUBBED — 1 mock video)
    │   └── watch/[video_id]/page.tsx # /home/watch/:id — player (MOCK only)
    └── admin/
        ├── page.tsx                  # /admin — dashboard with stats
        ├── videos/
        │   ├── page.tsx              # /admin/videos — video table
        │   └── upload/page.tsx       # /admin/videos/upload — upload form
        ├── categories/page.tsx       # /admin/categories
        ├── analytics/page.tsx        # /admin/analytics
        ├── users/page.tsx            # /admin/users
        └── settings/page.tsx         # /admin/settings
```

---

## Authentication Flow

### Storage
Tokens live in `localStorage` (managed by `lib/utils/tokenManager.ts`):
- `access_token` — short-lived, sent as `Authorization: Bearer` on every request
- `refresh_token` — long-lived, used to rotate access token on 401

### Auth Store (Zustand)
`lib/store/authStore.ts` — single global store:

```
State: { user: User | null, isAuthenticated: boolean, isLoading: boolean }

initialize()        → called on protected layout mount; validates stored token via GET /user/profile
signin(email, pw)   → POST /auth/signin → store tokens → set user
signup(...)         → POST /auth/signup → redirect to /auth/sign-in (no auto-login)
logout()            → POST /auth/logout (revoke refresh token) → clear localStorage
refreshToken()      → POST /auth/refresh → replace access_token in storage
```

### Auto Refresh (Axios Interceptor)
`lib/apis/client.ts` intercepts every 401 response:
1. Check `shouldAttemptTokenRefresh()` — only refreshes for "Token expired", not invalid credentials
2. Call `/auth/refresh`
3. Retry original request with new token
4. If refresh fails → redirect to `/auth/sign-in`

### Protected Layout Guard
`app/(protected)/layout.tsx`:
- Calls `initialize()` on mount
- Shows spinner while loading
- Redirects to `/auth/sign-in` if not authenticated after init

---

## State Management

| Tool | Used For | Status |
|------|---------|--------|
| Zustand | Auth state (user, tokens) | In use |
| TanStack Query | Server state (videos, etc.) | Provider wired, but **not yet used in pages** |
| `videoStore.ts` | Intended for video state | **Empty file** |
| `userStore.ts` | Intended for user state | **Empty file** |

TanStack Query `QueryClient` is initialized in `providers/tanstackqueryprovider.tsx` with `ReactQueryDevtools` included.

---

## API Integration

**Base client:** `lib/apis/client.ts`
- Axios instance: `baseURL = NEXT_PUBLIC_API_URL || 'http://localhost:8000'`
- Auth interceptor adds Bearer token to every request

**API modules:**

| Module | File | Endpoints |
|--------|------|-----------|
| Auth | `lib/apis/auth.api.ts` | signup, signin, logout, refresh, verify-email, resend-verification, forgot-password, reset-password, getProfile |
| Video | `lib/apis/video.ts` | uploadVideo, saveDraft, getAdminVideos, deleteVideo, getVideoStatus |

---

## Video Upload Flow (What's Wired)

1. **`/admin/videos/upload`** — `UploadForm` orchestrates form state (react-hook-form + Zod)
2. **`VideoUploadZone`** — react-dropzone for MP4, max 5 GB
3. **`ThumbnailUploadZone`** — react-dropzone for images
4. **Form sections:** BasicInformationSection (title, description) · AdditionalDetailsSection (rating, director, cast, tags) · PublishingSection (draft/published/scheduled)
5. **Submit:** `video.ts:uploadVideo()` → `POST /videos/create` with `FormData`
6. On success: opens `VideoProcessingDialog` with the returned `video_id`
7. **Status polling:** `hooks/video/use-video-processing.ts` polls `GET /videos/{id}/status` every 3s
8. **Processing dialog:** 7-phase animated progress (Upload → Queue → Analyze → Transcode → Segment → Package → Deploy)

**What's NOT wired:**
- Draft saving (1-second fake delay, TODO comment)
- Upload progress bar (code commented out in `VideoUploadZone.tsx:79-87`)
- Retry on processing failure (button renders but no handler)

---

## Key Components

### Dev/Demo Scaffolding (not for production)
- `MockDataBanner` — amber banner for preview mode
- `DevModeBadge` — fixed bottom-right info badge (commented out in `layout.tsx`)
- `DemoWatermark` — watermark component

### Home Feed (mostly stubbed)
`app/(protected)/home/page.tsx` has nearly all content commented out. Only `VideoGrid` renders, and it shows 1 hardcoded mock video (Stranger Things S4 from Unsplash).

Components that exist but are commented out:
`HeroSection · CategoryPills · AIWatchTimeBanner · MoodSelector · ContinueWatching · Top10ThisWeek · PersonalizedRow · ContentJourney · QuickAccessSidebar`

### Video Player (mock)
`app/(protected)/home/watch/[video_id]/_components/VideoPlayer.tsx` — Custom controls over a static `<img>`. Uses local state for play/pause, volume, progress. No actual video or streaming.

### AI Feature Components (all static)
All render hardcoded data — no backend calls:
- `AISceneTimeline` — 6 hardcoded scenes with timestamps
- `AIMoodAnalysis` — hardcoded emotion bars (Suspense 85%, Drama 72%...)
- `AIRecommendations` — no implementation
- `AIWatchParty` — no implementation
- `AIContentWarnings` — no implementation

---

## Type Definitions

**User** (`lib/types/auth.ts`):
```typescript
{ id, email, username, role, is_verified }
```

**Video** (`lib/types/video.ts`):
```typescript
{
  id, title, description, category, status,
  processing_status, processing_metadata,  // FFprobe output
  manifest_url,                            // path to master.m3u8
  available_qualities,                     // ["1080p","720p",...]
  thumbnail_url, raw_video_path,
  views_count, likes_count, tags, ...
}
```

**ProcessingStatus enum** (`lib/types/video.ts`):
`UPLOADING · QUEUED · PREPARING · TRANSCODING · AGGREGATING · SEGMENTING · CREATING_MANIFEST · UPLOADING_TO_STORAGE · FINALIZING · COMPLETED · FAILED`

---

## Next.js Config

`next.config.ts` — image remotePatterns allow external image domains.
`tsconfig.json` — path aliases configured (`@/*` → project root).
`components.json` — shadcn/ui component configuration.

---

## Dependencies Worth Knowing

| Package | Purpose |
|---------|---------|
| `react-dropzone` | File upload zones |
| `react-hook-form` + `zod` | Form state + schema validation |
| `@tanstack/react-table` | Admin video management table |
| `recharts` | Admin analytics charts |
| `embla-carousel-react` | Home page carousel |
| `sonner` | Toast notifications |
| `lucide-react` | Icons |
| `@radix-ui/react-*` | Accessible primitives (dialog, dropdown, slider, tabs...) |
| `next-themes` | Dark mode (installed but not visibly integrated) |
| `@vercel/analytics` | Page view tracking |
