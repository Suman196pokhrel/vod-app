# 10 — Frontend Pages

**Files covered:** `app/app/(protected)/layout.tsx` · `admin/videos/upload/` · `hooks/video/use-video-processing.ts` · `home/watch/[video_id]/_components/VideoPlayer.tsx`

---

## Starting Point

The auth store, token manager, and API client are ready (chapter 09). This chapter covers how authenticated pages actually work — the route guard, the video upload form, the processing status hook, and the current (unfinished) state of the video player.

---

## `app/app/(protected)/layout.tsx` — The Auth Guard

Every page under `(protected)/` uses this layout. It's the gatekeeper.

```typescript
"use client"

const ProtectedLayout = ({ children }) => {
    const { isAuthenticated, isLoading, initialize } = useAuthStore()

    useEffect(() => {
        initialize()    // re-validate tokens on every page load
    }, [])              // empty array = run once on mount

    if (isLoading) {
        return <div>Loading spinner...</div>
    }

    if (!isAuthenticated) {
        router.push("/auth/sign-in")
        return null
    }

    return (
        <div>
            <HomeNavbar />
            {children}
        </div>
    )
}
```

**The spinner prevents a flash**

`isLoading` starts as `true`. While `initialize()` is running (a network request to validate the token), the layout renders a spinner instead of the page. Without this, there would be a visible "not authenticated" flash — the page would briefly redirect to sign-in before `initialize()` finishes and sets `isAuthenticated = true`. The spinner eliminates that flash.

**This is client-side protection only**

`"use client"` means this runs in the browser, not on the server. The HTML is delivered to the browser first; then React hydrates; then the auth check runs. A more advanced approach would use Next.js Middleware (which runs on the Edge, before the page is delivered) to redirect unauthenticated users before they ever receive the page HTML. For this project's stage, client-side is sufficient.

**`useEffect` with `[]` — run once on mount**

The empty dependency array `[]` means "run this effect once, when the component first mounts." `initialize()` is async — it doesn't block rendering. The spinner shows while it runs, then the layout renders the actual page once it resolves.

---

## The Upload Form — `admin/videos/upload/`

The upload page uses **react-hook-form** with **Zod** for form management and validation.

### Why react-hook-form?

A form with 10+ fields (title, description, category, age rating, director, cast, tags, release date, status, video file, thumbnail) would require 10+ `useState` calls to track manually. react-hook-form tracks all field values internally and only re-renders fields that actually change. Much more efficient.

### Why Zod?

Zod is a schema validation library. You define the shape of valid form data:

```typescript
// uploadForm/formSchema.ts
const formSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    category: z.string().min(1, "Category is required"),
    status: z.enum(["draft", "published", "scheduled"]),
    // ...
})
```

If the user submits an empty title, Zod provides the error message `"Title is required"` for that specific field. This works automatically — you don't write any validation logic yourself.

### The `FormData` Construction

The backend accepts `multipart/form-data` for video uploads. This is how the frontend builds the request:

```typescript
const formData = new FormData()
formData.append('video', videoFile)                      // binary file
formData.append('thumbnail', thumbnailFile)              // binary file (optional)
formData.append('data', JSON.stringify(formValues))      // JSON string in form field
```

The metadata (title, description, etc.) is serialized to JSON and sent as a plain form field — because multipart form fields hold strings, not structured objects. The `Content-Type: application/json` header applies to JSON-body requests, not multipart parts.

### After Successful Upload

```typescript
const response = await uploadVideo(formData)
openDialog(response.video_id)   // ← opens the processing status dialog
```

The API returns the new video's ID immediately. The form opens a `VideoProcessingDialog` with that ID, which starts polling the backend for status updates every 3 seconds.

### What's Not Wired

**Draft saving:**
```typescript
const handleSaveDraft = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000))  // fake delay
    // TODO: actual API call
}
```
The "Save Draft" button shows a spinner for 1 second then claims success. No API call is made. Data is lost on navigation.

**Upload progress bar:**
Lines 79–87 in `VideoUploadZone.tsx` have an Axios `onUploadProgress` callback commented out. The file is selected and submitted, but no progress bar appears during the actual upload.

**Retry on failure:**
The processing dialog has a "Retry" button that renders in the error state, but the `onRetry` prop is never passed from the parent page. Clicking it does nothing.

---

## `app/hooks/video/use-video-processing.ts` — Polling Hook

This hook manages the processing dialog state and polls the backend for status updates.

```typescript
export const useVideoProcessing = (options) => {
    const [isOpen, setIsOpen] = useState(false)
    const [currentStatus, setCurrentStatus] = useState(ProcessingStatus.UPLOADING)
    const videoIdRef = useRef<string | null>(null)  // ← ref, not state

    useEffect(() => {
        if (!isOpen || !videoIdRef.current) return

        const interval = setInterval(async () => {
            const data = await getVideoStatus(videoIdRef.current!)
            setCurrentStatus(data.status)
            if (data.is_completed) onComplete?.(videoIdRef.current!)
            if (data.is_failed) onError?.(new Error(data.error))
        }, pollingInterval)  // default: 2000ms

        return () => clearInterval(interval)  // ← cleanup when dialog closes
    }, [isOpen, pollingInterval])
```

### Why `useRef` for the Video ID?

`videoIdRef` is a `useRef`, not `useState`. Here's why that matters:

If `videoId` were in state, changing it would trigger a re-render, which would cause `useEffect` to re-run (because state changes cause re-renders, and re-renders restart effects). The polling interval would be cleared and restarted every time the video ID was set.

With `useRef`, the value is stored in a mutable container that doesn't trigger re-renders. The `useEffect` only depends on `isOpen` and `pollingInterval`. The interval reads `videoIdRef.current` on each tick and always gets the current value — but the interval itself isn't restarted when the ID changes.

### The Cleanup Function

```typescript
return () => clearInterval(interval)
```

React calls this cleanup function when:
- The component unmounts (dialog closes, user navigates away)
- Before re-running the effect (if `isOpen` or `pollingInterval` changes)

Without cleanup, the interval keeps running after the dialog closes, making unnecessary API calls every 2 seconds indefinitely.

### Polling Every 2 Seconds

2000ms is the default. Processing typically takes several minutes — 2 seconds is frequent enough to feel responsive without hammering the backend. WebSockets would be a cleaner real-time solution, but polling is simpler and sufficient for this use case.

---

## `home/watch/[video_id]/_components/VideoPlayer.tsx` — The Mock Player

The video player page exists at `/home/watch/{video_id}`. It looks like a real player — play/pause button, volume slider, progress bar, fullscreen toggle. But there's no actual video playing anywhere.

```typescript
const [isPlaying, setIsPlaying] = useState(false)
const [volume, setVolume] = useState(70)
const [currentTime, setCurrentTime] = useState(0)
const [duration, setDuration] = useState(0)

// There is no <video> element.
// There is no HLS.js.
// The controls toggle state but nothing plays.
```

A static thumbnail image fills the player area. Clicking "play" sets `isPlaying = true` and changes the button icon. That's it.

**What a real implementation would look like:**

```typescript
import Hls from 'hls.js'

useEffect(() => {
    if (!videoRef.current || !video.manifest_url) return

    if (Hls.isSupported()) {
        const hls = new Hls()
        const streamUrl = `${process.env.NEXT_PUBLIC_MINIO_URL}${video.manifest_url}`
        hls.loadSource(streamUrl)      // load master.m3u8
        hls.attachMedia(videoRef.current)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoRef.current.play()
        })
    }
}, [video.manifest_url])

return <video ref={videoRef} controls />
```

HLS.js would:
1. Load the master playlist from MinIO
2. Read the available quality levels and their bandwidths
3. Pick the appropriate quality based on current download speed
4. Download `.ts` segments on demand as playback progresses
5. Automatically switch quality levels as bandwidth changes

This is the most significant incomplete feature. The entire backend pipeline produces perfect HLS output — `manifest_url` is set, all quality levels are in MinIO — but nothing on the frontend actually plays it.

---

## The Home Feed — Also Stubbed

The home feed at `/home` has nearly all of its content commented out:

```typescript
// page.tsx
export default function HomePage() {
    return (
        <main>
            {/* <HeroSection /> */}
            {/* <CategoryPills /> */}
            {/* <AIWatchTimeBanner /> */}
            {/* <MoodSelector /> */}
            {/* <ContinueWatching /> */}
            {/* <Top10ThisWeek /> */}
            <VideoGrid />    ← only this renders
            {/* ... more commented out ... */}
        </main>
    )
}
```

`VideoGrid` renders one hardcoded mock video (Stranger Things Season 4 with an Unsplash image). It's not connected to `GET /videos/`. The backend API for public video listing works — it just isn't called.

---

## The AI Feature Components — Static Data

Every AI component in the watch page renders hardcoded data:

- `AISceneTimeline` — 6 hardcoded scene objects with timestamps and descriptions
- `AIMoodAnalysis` — hardcoded bars (`Suspense: 85%`, `Drama: 72%`, ...)
- `AIRecommendations`, `AIWatchParty`, `AIContentWarnings` — no visible implementations

These are design/UI demos. No backend AI endpoints exist.

---

## End of the Story

That's the entire codebase, file by file:

| What's Working | What Needs Building |
|----------------|---------------------|
| Auth (signup, verify, signin, refresh, logout, password reset) | HLS.js video player |
| Video upload with MinIO storage | VideoGrid → real API |
| Full Celery processing pipeline (parallel transcode → HLS → upload) | Draft saving |
| Processing status polling | Upload progress bar |
| Admin video table (filtered, sorted, paginated) | Admin analytics/categories/users APIs |
| Route protection | Retry on processing failure |

The backend pipeline is production-grade. The most valuable next step is wiring the frontend to it: implement HLS.js, connect the home feed to the API, and fix the `delete_video` bug (`video.raw_video_path` not `video.video_url`).

---

*See [PROJECT_STATUS.md](../PROJECT_STATUS.md) for the complete bug list and production readiness checklist.*
