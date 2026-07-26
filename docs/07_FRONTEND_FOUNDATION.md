# 07 - Frontend Foundation

With the backend pipeline fully documented, let's shift to the frontend. The Next.js app is where users actually interact with everything we've built. But before looking at any individual page, you need to understand the foundation: how the API client works, how authentication state is managed, and how tokens flow through the system. Getting this wrong breaks everything above it.

---

## Technology Overview

The frontend is a **Next.js 16** app using the **App Router** (not the older Pages Router). It uses:

- **React 19** - the latest React release
- **TypeScript** - all code is typed
- **Tailwind CSS v4** - utility-first styling with the new v4 configuration format
- **Zustand** - lightweight global state management for auth
- **TanStack Query** (React Query) - for server state management (underused currently - the home feed and video pages use direct API calls instead)
- **shadcn/ui** - pre-built accessible UI components (buttons, dialogs, forms, etc.)
- **Axios** - HTTP client with interceptors for token attachment and auto-refresh

---

## Directory Layout

```
app/
├── app/
│   ├── (public)/            ← No auth required
│   │   ├── auth/            ← sign-in, sign-up, verify-email, forgot/reset password
│   │   └── (browse)/        ← nested group, contributes no path segment
│   │       ├── page.tsx           ← the video feed - this IS the root route "/"
│   │       └── watch/[video_id]/  ← watch detail page, public - /watch/[video_id]
│   ├── play/[video_id]/     ← Immersive full-screen player, public, outside every route group
│   └── (protected)/         ← Client-side auth-guarded
│       └── admin/           ← Admin panel - the ONLY thing under (protected)
├── lib/
│   ├── apis/            ← Typed API function modules + shared Axios client (client.ts, auth.api.ts, video.ts, tusUpload.ts)
│   ├── store/           ← Zustand stores
│   ├── types/           ← TypeScript type definitions
│   └── utils/           ← tokenManager, safeNextPath, featureFlags, constants, helpers
├── hooks/               ← Custom React hooks
└── components/
    └── ui/              ← shadcn/ui components
```

`app/play/[video_id]/` sits deliberately outside every route group - nesting it under `(public)` would have it inherit `(browse)/layout.tsx`'s site navbar, which the immersive player page doesn't want. See [09_FRONTEND_HOME_AND_WATCH.md](./09_FRONTEND_HOME_AND_WATCH.md) for why the watch experience is split into two routes at all.

The parentheses in `(public)`, `(protected)`, and `(browse)` are Next.js route groups - they don't appear in URLs but let you apply different layouts to different sections of the app without affecting the route structure. `(browse)` is nested inside `(public)` purely to give the feed and watch page their own layout file without adding a URL segment.

This reflects a deliberate route restructure: the app used to guard everything under `(protected)`, including the home feed and watch page. It now follows a "content is public, actions require auth" model - browsing and watching never touch an auth check. Only `/admin` is guarded, plus a handful of specific interactive controls gated by the `useRequireAuth` hook (see [09_FRONTEND_HOME_AND_WATCH.md](./09_FRONTEND_HOME_AND_WATCH.md)). Permanent redirects in `next.config.ts` send the old `/home` and `/home/watch/:video_id` paths to `/` and `/watch/:video_id`.

---

## The Axios Client

**`app/lib/apis/client.ts`** - this is the most important file in the frontend. Every API call in the app goes through this single configured Axios instance.

```typescript
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})
```

The client has two interceptors:

**Request interceptor** - reads the access token from localStorage and attaches it to every outgoing request:

```typescript
apiClient.interceptors.request.use((config) => {
  const token = tokenManager.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

**Response interceptor** - handles 401 responses by automatically refreshing the access token and retrying the original request:

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      const refreshToken = tokenManager.getRefreshToken()
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
          tokenManager.setAccessToken(data.access_token)
          error.config.headers.Authorization = `Bearer ${data.access_token}`
          return apiClient(error.config)  // retry original request
        } catch {
          tokenManager.clearTokens()
          window.location.href = '/auth/sign-in'
        }
      }
    }
    return Promise.reject(error)
  }
)
```

The `_retry` flag prevents an infinite loop if the refresh request itself returns a 401.

This interceptor means most components never need to think about token expiry - it's handled automatically. The session just works until the refresh token expires (7 days), at which point the user is redirected to sign in.

---

## Token Storage

**`app/lib/utils/tokenManager.ts`** - a thin wrapper over `localStorage` that provides typed access to the two tokens:

```typescript
const tokenManager = {
  getAccessToken: () => localStorage.getItem('access_token'),
  setAccessToken: (token: string) => localStorage.setItem('access_token', token),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  setRefreshToken: (token: string) => localStorage.setItem('refresh_token', token),
  clearTokens: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }
}
```

Why `localStorage` and not cookies? localStorage is simpler to implement with Axios interceptors - you read it synchronously and attach the value to headers. Cookies require more ceremony (credentials: 'include', CORS cookie settings, httpOnly configuration). The trade-off: localStorage is accessible from JavaScript (XSS risk). This is documented in Known Issues.

---

## Auth State: Zustand Store

**`app/lib/store/authStore.ts`** - the global auth store. This is the primary Zustand store that's actually implemented. (`userStore.ts` and `videoStore.ts` exist as files but are currently empty placeholders.)

The store holds:
```typescript
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  // actions:
  initialize: () => Promise<void>
  signin: (email: string, password: string) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  refreshToken: () => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: Partial<User>) => void
}
```

**`initialize()`** is the most important action. It's called once when the app first loads (in `ProtectedLayout`). It:
1. Reads the access token from localStorage
2. If present, calls `authAPI.getProfile()`, which hits `GET /user/profile`, to fetch the current user's profile
3. On success: sets `user` and `isAuthenticated = true`
4. On failure (token expired or invalid): tries to refresh using the refresh token
5. If refresh also fails: clears tokens and sets `isAuthenticated = false`

This means the auth state is derived from localStorage + backend validation every time the app opens. If you're logged in and your access token expired while the browser was closed, `initialize()` transparently refreshes it and you stay logged in - in most cases. `GET /user/profile` uses a separate, differently-behaved `get_current_user` on the backend that doesn't cleanly return a 401 on an expired token (it can 500 instead) - see [04_AUTH_SYSTEM.md](./04_AUTH_SYSTEM.md) for the underlying bug. This means the "expired token transparently refreshes" story is less reliable specifically for this call than it is elsewhere in the app.

---

## Route Protection

**`app/(protected)/layout.tsx`** - the layout component that wraps `/admin` (the only thing left under `(protected)` since the route restructure):

```typescript
useEffect(() => {
  initialize()
}, [])

if (isLoading) { /* spinner */ }

if (!isAuthenticated) {
  router.push(buildSignInUrl(pathname))
  return null
}

return <>{children}</>
```

Note this layout renders no navbar of its own and no wrapper element - it used to render `<HomeNavbar />` here, but that produced a duplicate navbar stacked on top of `admin/layout.tsx`'s own `AdminSidebar`/`AdminHeader` chrome (which every admin page already has), so it was removed. The public site's `HomeNavbar` now lives only in `(public)/(browse)/layout.tsx`, where it belongs.

`app/(protected)/admin/layout.tsx` layers a role check on top of this, and is the one that actually renders the admin chrome:

```typescript
useEffect(() => {
  if (!isLoading) {
    if (!isAuthenticated) {
      router.push(buildSignInUrl(pathname))
    } else if (user?.role !== "admin") {
      router.push("/")
    }
  }
}, [isLoading, isAuthenticated, user, router])
```

`buildSignInUrl` (in `lib/utils/safeNextPath.ts`) builds `/auth/sign-in?next=<current-path>` so the user lands back where they were after signing in - see [09_FRONTEND_HOME_AND_WATCH.md](./09_FRONTEND_HOME_AND_WATCH.md) for `getSafeNextPath`'s open-redirect guard. There is **no Next.js `middleware.ts`** anywhere in this codebase - this is purely a client-side layout guard, same mechanism as before the route restructure, just narrowed in scope now that browse/watch are public. (A commit in the project's history is titled "middleware allows public routes"; despite the name, its diff only touches these layout files - there's no `middleware.ts` to find.) A real middleware-based approach would protect `/admin` at the edge instead of after a client render. See Future Upgrades.

---

## API Function Modules

The `lib/apis/` directory has one file per domain. There is no `user.ts` - profile fetching lives on the auth module, since there's no admin user-management API on either side yet.

- **`client.ts`** - the shared Axios instance (don't import Axios directly elsewhere). Requests can pass a `skipAuthRedirect: true` config flag; the response interceptor checks it before attempting a token refresh or redirecting to sign-in on a 401. Public browse/watch calls set this flag so an expired or missing token never bounces an anonymous viewer to the login page.
- **`auth.api.ts`** - default-exports a single `authAPI` object, not standalone named functions: `authAPI.signin()`, `authAPI.signup()`, `authAPI.logout()`, `authAPI.getProfile()`, `authAPI.refresh()`, `authAPI.verifyEmail()`, `authAPI.resendVerification()`, `authAPI.forgotPassword()`, `authAPI.resetPassword()`.
- **`video.ts`** - `uploadVideo()` (the legacy multipart upload - there's no `createVideo()`), `deleteVideo()`, `getVideoStatus()`, `incrementVideoView()`, `getPublicVideos()`, `getVideoById()`, `getAdminVideos()`, `calculatePagination()`, `updateVideoDetails()`, `uploadVideoThumbnail()`, `updateVideoVisibility()`, `getVideoDownloadUrl()`, and `saveDraft()`. `saveDraft()` is implemented and exported, but posts to a `POST /videos/draft` backend route that doesn't exist, and neither upload form calls it yet anyway (see [11_FRONTEND_VIDEO_UPLOAD.md](./11_FRONTEND_VIDEO_UPLOAD.md)).
- **`tusUpload.ts`** - `getTusUploadStatus()`, used to poll for the `video_id` a resumable upload resolved to. See [15_RESUMABLE_UPLOADS.md](./15_RESUMABLE_UPLOADS.md).

All functions return typed promises and let Axios errors propagate to the caller (which handles them with try/catch).

---

## TypeScript Types

`lib/types/` contains the TypeScript interfaces that mirror the backend Pydantic schemas:

```typescript
interface User {
  id: string
  email: string
  username: string
  role: 'user' | 'admin'   // note: lowercase, matches DB enum lowercase values
  is_verified: boolean
  is_active: boolean
}

interface Video {
  id: string
  title: string
  description: string
  category: string
  processing_status: ProcessingStatus
  manifest_url: string | null
  thumbnail_url: string | null
  available_qualities: string[] | null
  views_count: number
  // ... etc
}
```

Keep these in sync with the backend schemas manually - there's no automatic type generation from the OpenAPI spec yet. Adding `openapi-typescript` to auto-generate these from the Swagger schema would be a significant quality-of-life improvement.

---

## Future Upgrades

- **Middleware-based route protection** - use Next.js `middleware.ts` to protect routes at the edge before React renders, eliminating the flash of unauthenticated content
- **httpOnly cookie tokens** - move from localStorage to httpOnly cookies for XSS protection; requires backend changes to set cookies
- **Auto-generated API types** - use `openapi-typescript` to generate TypeScript types from the FastAPI OpenAPI schema, eliminating manual sync
- **TanStack Query for all API calls** - currently underused; adopting it consistently would give you caching, background refetching, and loading/error states for free
- **React Query devtools** - add to the dev environment for debugging query state

---

## What's Next

Now that you understand the foundation, let's see the first real user-facing feature built on top of it: the authentication pages. The next document covers every auth screen - sign-up, email verification, sign-in, forgot password, and reset password - all of which are fully implemented and working.
