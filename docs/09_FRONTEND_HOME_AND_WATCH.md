# 09 — Frontend: Home Feed and Watch Page

After a user logs in, they land on the home feed. The watch page is where they actually watch a video. These are two of the most important pages in the app — and they're also two of the biggest areas where real work remains. This document is honest about what's wired up and what's still mocked.

---

## The Home Feed: `/home`

**`app/(protected)/home/page.tsx`**

If you open this file, you'll find that most of the page components are commented out. The current state:

```typescript
export default function HomePage() {
  return (
    <div className="...">
      <VideoGrid />
      {/* <HeroSection /> */}
      {/* <HomeCarousel title="New Releases" /> */}
      {/* <HomeCarousel title="Trending" /> */}
      {/* <AIFeaturesBanner /> */}
    </div>
  )
}
```

Only `VideoGrid` is currently rendered. Everything else — the hero section, carousels, and AI banner — exists as components but is commented out in the page.

### VideoGrid

**`app/(protected)/home/_components/VideoGrid.tsx`**

This component is responsible for rendering the video grid on the home feed. However, it currently renders a **single hardcoded mock video** rather than fetching real data from the API:

```typescript
const MOCK_VIDEO = {
  id: "mock-1",
  title: "Sample Video",
  thumbnail_url: "https://images.unsplash.com/...",
  view_count: 12453,
  // ...
}
```

Why? The frontend API module (`lib/apis/video.ts`) doesn't yet have a `getPublicVideos()` function implemented. The route exists on the backend (`GET /videos/`), but the frontend function to call it hasn't been written.

**To wire this up:** implement `getPublicVideos(page, pageSize, category?)` in `lib/apis/video.ts` and update `VideoGrid` to call it with TanStack Query or direct Axios.

### VideoCard

Individual video cards rendered in the grid. Shows the thumbnail, title, view count, and category badge. Clicking a card navigates to `/home/watch/{video_id}`.

### HeroSection, HomeCarousel

These components exist and are built, but they're commented out in the page. They use their own hardcoded mock data. Before uncommenting them, they'd need real API integration too.

---

## The Watch Page: `/home/watch/[video_id]`

**`app/(protected)/home/watch/[video_id]/page.tsx`**

This is where a user goes when they click on a video card. The route parameter is `video_id` (the folder name is `[video_id]`), but there is a **known bug in the current code**: the page reads `params.id` instead of `params.video_id`.

```typescript
// Current code (buggy):
const { params } = props
const videoId = params.id  // ← undefined! route param is video_id, not id
```

This means `videoId` is always `undefined` on the watch page, which means any API call to fetch the video would use `undefined` as the ID. In practice, the page uses hardcoded mock data (so the bug isn't visible), but it will break immediately when real data fetching is wired up.

**The fix:** change `params.id` to `params.video_id`.

### Watch Page Layout

The watch page has a rich layout with several sections:

- `VideoPlayer` — the main video area
- `VideoDetails` — title, description, rating, cast, director
- `VideoActions` — like button, share button, add to watchlist
- `AIFeaturesBanner` — AI mood analysis banner (UI mock)
- `CommentsSection` — comments UI (fully mocked, no backend)
- `SceneTimeline` — interactive timeline (fully mocked)
- `RelatedVideos` — sidebar with related content (hardcoded mock data)

All of these components except `VideoPlayer` use hardcoded data and are not fetching anything from the API. The entire page currently shows the same static mock video regardless of which `video_id` is in the URL.

---

## The Video Player: A UI Mock

**`app/(protected)/home/watch/[video_id]/_components/VideoPlayer.tsx`**

This is arguably the most critical unfinished piece of the entire project. The current `VideoPlayer` component is a complete UI mock:

```typescript
export default function VideoPlayer({ video }) {
  const [isPlaying, setIsPlaying] = useState(false)
  
  return (
    <div className="relative aspect-video bg-black">
      <Image src={video.thumbnail_url} fill alt={video.title} />
      
      {/* Fake play/pause toggle */}
      <button onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      
      {/* Non-functional seek bar */}
      <input type="range" value={0} onChange={() => {}} />
      
      {/* Fake quality selector */}
      <select>
        <option>1080p</option>
        <option>720p</option>
      </select>
    </div>
  )
}
```

It shows:
- The video thumbnail (static image, not a video)
- A play/pause button that toggles a boolean but doesn't play anything
- A seek bar that's always at 0% and doesn't respond to dragging
- A quality selector with hardcoded options

There is **no HLS.js** integration. No `<video>` element. No actual streaming.

### Implementing Real Video Playback

The backend generates a valid `master.m3u8` HLS manifest for every processed video. The player needs HLS.js to consume it.

Install HLS.js:
```bash
cd app
pnpm add hls.js
```

Basic implementation:
```typescript
import Hls from 'hls.js'

useEffect(() => {
  if (!video.manifest_url) return
  
  const manifestUrl = `${process.env.NEXT_PUBLIC_API_URL}/storage/processed/${video.manifest_url}`
  
  if (Hls.isSupported()) {
    const hls = new Hls()
    hls.loadSource(manifestUrl)
    hls.attachMedia(videoRef.current)
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoRef.current.play()
    })
    return () => hls.destroy()
  } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari supports HLS natively
    videoRef.current.src = manifestUrl
  }
}, [video.manifest_url])
```

This is one of the highest-priority tasks to complete. Without it, the video platform doesn't actually play videos.

---

## Missing Frontend API Functions

To complete the home feed and watch page, these functions need to be added to `lib/apis/video.ts`:

```typescript
// Get public video feed (paginated)
export async function getPublicVideos(page = 1, pageSize = 20, category?: string) {
  const params = { page, page_size: pageSize, ...(category && { category }) }
  const { data } = await apiClient.get('/videos/', { params })
  return data
}

// Get a single video by ID
export async function getVideoById(videoId: string) {
  const { data } = await apiClient.get(`/videos/by-id/${videoId}`)
  return data
}

// Increment view count
export async function incrementVideoView(videoId: string) {
  await apiClient.post(`/videos/${videoId}/view`)
}
```

---

## MinIO URL Construction

Video thumbnails and manifests are stored in MinIO as object paths (not full URLs). The frontend needs to construct the full URL. For thumbnails in the video grid:

```typescript
const thumbnailUrl = `${process.env.NEXT_PUBLIC_API_URL}/storage/thumbnails/${video.thumbnail_url}`
```

But Caddy needs to proxy `/storage/*` to MinIO. This routing isn't set up in the current `Caddyfile.local`. This needs to be added before thumbnails will display from real video records.

Alternatively, generate presigned URLs from the backend and return them as part of the video response — cleaner but requires backend changes.

---

## Future Upgrades

- **HLS.js integration** — implement real video playback (the single highest-priority task)
- **Real API integration for home feed** — replace mock data in VideoGrid with `getPublicVideos()`
- **Fix the params.id bug** — change to `params.video_id` on the watch page
- **Comments backend** — the Comments section UI is built; it needs a comments API and database table
- **Watch history** — track what users have watched, enable "continue watching"
- **Infinite scroll** — load more videos as the user scrolls down the home feed

---

## What's Next

We've covered the user-facing pages. Now let's look at the admin side of the frontend — the panel that admins use to manage videos and users. The next document covers the admin panel structure, what's real, and what's still a placeholder.
