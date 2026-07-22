# 09 — Frontend: Home Feed and Watch Page

After a user logs in — or, just as often now, without logging in at all — they land on the home feed. The watch page is where they actually watch a video. These are the two pages that define whether this platform actually works as a VOD product, and as of the route restructure covered in [07_FRONTEND_FOUNDATION.md](./07_FRONTEND_FOUNDATION.md), they're also the two pages that moved: both now live under `app/(public)/(browse)/`, reachable with no account. This document covers what's real, what's still mocked, and how the real parts — the public routing, the video.js player, and the scrubbing-preview thumbnails — actually work.

---

## The Home Feed: `/` (formerly `/home`)

**`app/(public)/(browse)/page.tsx`**

```tsx
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <div className="max-w-[2000px] mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <CategoryPills />
        <VideoGrid />
      </div>
    </div>
  )
}
```

Three components render, all real: `HeroSection`, `CategoryPills`, and `VideoGrid`. This page used to be `app/(protected)/home/page.tsx` with several mock components (`HomeCarousel`, an AI features banner, and others) commented out awaiting real data. Those mock components are gone from this page entirely now — not commented out, just not imported. The standalone marketing landing page that used to live at `app/(public)/page.tsx` was deleted in the same restructure; this browse feed *is* the root page now. (Its components, `Landing*.tsx`, are still on disk under `app/(public)/_components/` but nothing imports them — the same "orphaned, not deleted" fate as the AI mock components covered in [12_AI_FEATURES.md](./12_AI_FEATURES.md).)

### VideoGrid — real data

**`app/(public)/(browse)/_components/VideoGrid.tsx`**

```tsx
useEffect(() => {
  getPublicVideos()
    .then(setVideos)
    .catch(() => setError("Couldn't load videos. Try refreshing the page."))
    .finally(() => setLoading(false))
}, [])
```

`getPublicVideos()` (`lib/apis/video.ts`) calls `GET /videos/` with `skipAuthRedirect: true` — this flag tells the shared Axios client not to attempt a token refresh or bounce to sign-in if the request comes back unauthenticated, since an anonymous visitor browsing videos should never see a login redirect just because they don't have a token. The grid renders a skeleton (shaped like the eventual card grid, not a spinner) while loading, and an actionable empty state ("No videos yet. Upload one to get started.") if the list comes back empty.

### VideoCard

Individual cards in the grid: thumbnail, title, view count, category badge. Clicking navigates to `/watch/{video_id}` (not `/home/watch/{video_id}` — see the route restructure in [07_FRONTEND_FOUNDATION.md](./07_FRONTEND_FOUNDATION.md)).

### HeroSection and CategoryPills

`HeroSection` is a real, restyled component (not mock data from an older revision of this doc) sitting above the grid. `CategoryPills` is a genre filter bar — 12 categories, each represented by a lucide icon that morphs into a checkmark on hover/selection (via GSAP `MorphSVGPlugin`), sharing an icon registry (`lib/icons/categoryIcons.ts`) with the admin category manager.

---

## The Watch Page: `/watch/[video_id]` (formerly `/home/watch/[video_id]`)

**`app/(public)/(browse)/watch/[video_id]/page.tsx`**

This page fetches a real video by the route's `video_id` parameter:

```tsx
const WatchPage = ({ params }: { params: Promise<{ video_id: string }> }) => {
  const { video_id } = use(params)

  useEffect(() => {
    getVideoById(video_id)
      .then(setVideo)
      // ...
  }, [video_id])
  // ...
}
```

An earlier revision of this document (and of the app) described a bug here — the page reading `params.id` instead of `params.video_id`, always fetching `undefined`. That's fixed: the parameter is destructured correctly, and `getVideoById()` is a real, implemented function (`GET /videos/by-id/{video_id}`, with `skipAuthRedirect: true` for the same anonymous-friendly reason as the feed).

### Watch Page Layout

- `VideoPlayer` — the main video area, covered in detail below
- `VideoInfo` — title, description, rating, cast, director, and the like/dislike/watchlist/follow action row
- `CommentSection` — comments UI, still backed by hardcoded mock data (no backend table or endpoints exist yet)
- `RelatedVideos` — sidebar with related content

The five AI mock widgets that used to sit on this page (`AISceneTimeline`, `AIMoodAnalysis`, `AIRecommendations`, `AIWatchParty`, `AIContentWarnings`) were deleted from `page.tsx` during the design-system migration — their imports and JSX usage are gone, though the component files themselves remain on disk unused. See [12_AI_FEATURES.md](./12_AI_FEATURES.md).

A signature visual touch on this page: `useAmbientColor` extracts an average color from the video's thumbnail (client-side, on a 16×16 canvas downsample) and renders a soft blurred glow behind the player, tinting the page to match the content. It fails silently — on a CORS-tainted image or any error, the glow is just absent, never a broken page. Full details in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) §6.

---

## The Video Player: Real Playback via `@videojs/react`

**`app/(public)/(browse)/watch/[video_id]/_components/player/`**

This is no longer a UI mock — hasn't been for a while, in fact. An earlier revision of this document described a thumbnail image with fake play/pause and a non-functional seek bar; that was already stale by the time of the dark/cyan design migration, which found a fully working custom HLS player already in place. What's changed *since* is the player library itself: it was migrated to **`@videojs/react`** (the `10.0.0-beta` line), with a custom skin (`videojs-skin/Skin.tsx`) built by "ejecting" and modifying video.js's Default Video Skin.

One precision worth holding onto: "migrated to video.js" is true for the ecosystem (the packages are `@videojs/core` and `@videojs/react`, published by the video.js project) but the classic `video.js` npm package itself is only a transitive dependency — nothing imports it directly. If you go looking for `import videojs from 'video.js'`, you won't find it; look for `@videojs/react` instead.

```tsx
// VideoPlayer.tsx
export default function VideoPlayer({ video, theater, onToggleTheater, className }: VideoPlayerProps) {
  const thumbnails = useStoryboardThumbnails(video.storyboard_url)

  return (
    <VideoJsSkin
      src={storageUrl(video.manifest_url)}
      poster={video.thumbnail_url ? storageUrl(video.thumbnail_url) : undefined}
      thumbnails={thumbnails}
      theater={theater}
      onToggleTheater={onToggleTheater}
      // ...
    />
  )
}
```

Inside the skin, HLS playback and adaptive quality switching come from `@videojs/react`'s `HlsJsVideo` element:

```tsx
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video'
// ...
<HlsJsVideo src={src} autoPlay playsInline />
```

This is what finally consumes the `master.m3u8` manifest the backend has been generating since the processing pipeline was built — the manifest sat unused in MinIO for a while before this player existed to load it.

### Scrubbing-Preview Thumbnails

The timeline's hover/drag preview — the thing that shows a small frame from the video as you scrub — is fed by the storyboard sprite sheets and WebVTT file the `generate_storyboard` Celery stage produces (see [06_VIDEO_PROCESSING_PIPELINE.md](./06_VIDEO_PROCESSING_PIPELINE.md)).

The original design spec for this feature proposed the standard approach: drop a `<track kind="metadata" label="thumbnails">` element on the video and let the player library auto-detect and parse it. **That's not what shipped.** In practice, the track element's base-URL resolution didn't come through reliably against a cross-origin storage host (MinIO on its own port/domain, not the app's origin), so the implementation fetches the VTT file directly and hand-parses its cues:

```ts
// useStoryboardThumbnails.ts (shape, not verbatim)
function useStoryboardThumbnails(storyboardUrl?: string | null): ThumbnailImage[] | undefined {
  // fetch the VTT, parse cues with parseMediaFragment (#xywh=x,y,w,h),
  // resolve each sprite filename relative to the VTT's own URL,
  // return pre-parsed { time, url, x, y, w, h } entries
}
```

The parsed thumbnails feed `Slider.Thumbnail`'s `thumbnails` prop directly:

```tsx
<Slider.Thumbnail className="media-thumbnail__image" thumbnails={thumbnails} />
```

`VideoJsSkinProps` reflects this — there is no `storyboardUrl`/`<track>` prop on the skin, only a pre-parsed `thumbnails?: ThumbnailImage[]` prop:

```ts
export interface VideoJsSkinProps {
  src: string
  poster?: string | RenderProp<Poster.State>
  /** Pre-parsed timeline scrubbing-preview thumbnails. Undefined for videos
   * processed before this existed, or while still loading. */
  thumbnails?: ThumbnailImage[]
  theater: boolean
  onToggleTheater: () => void
  // ...
}
```

If a video was processed before this feature shipped, `video.storyboard_url` is `null`, `useStoryboardThumbnails` returns `undefined`, and the player renders exactly as it did before — no preview strip, no error, no backfill.

**When any spec and the shipped code disagree, the code is what's documented here.** The design spec under `docs/superpowers/specs/2026-07-20-scrubbing-thumbnails-design.md` is a useful record of the reasoning that led here, but its `<track>`-based proposal is not what's running.

---

## Gating Actions for Logged-Out Viewers

Since browsing and watching require no account, the watch page needs a way to say "you can look, but you need to sign in to do that." That's `useRequireAuth` (`hooks/use-require-auth.ts`):

```ts
export function useRequireAuth() {
  const router = useRouter()
  const pathname = usePathname()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const requireAuth = useCallback((action: () => void) => {
    if (!isAuthenticated) {
      router.push(buildSignInUrl(pathname))
      return
    }
    action()
  }, [isAuthenticated, pathname, router])

  return { isAuthenticated, requireAuth }
}
```

It's used in exactly two places today:
- **`VideoInfo.tsx`** — gates Like, Dislike, Watchlist toggle, and Follow
- **`CommentSection.tsx`** — gates submitting a comment

Share and Download in `VideoInfo.tsx`, and reply/like on individual (mock) comments, aren't gated — they currently have no `onClick` handler at all, gated or otherwise. A logged-out click on a gated control routes to `/auth/sign-in?next=<current-path>`, so a successful sign-in returns the viewer to the exact video they were watching.

---

## What's Still Mock or Incomplete Here

Being direct about the remaining gaps, since that candor is this document's whole point:

| Area | Status |
|---|---|
| Home feed (`VideoGrid`) | Real — fetches `GET /videos/` |
| Watch page video fetch | Real — fetches `GET /videos/by-id/{id}` by the correct route param |
| Video playback | Real — `@videojs/react` + HLS, adaptive quality |
| Scrubbing-preview thumbnails | Real, for videos processed after the storyboard stage shipped |
| Like / Dislike / Watchlist / Follow | Gated correctly for logged-out users; no evidence of a backend behind the actions themselves beyond the gate |
| Comments | UI only — `CommentSection` renders a hardcoded `mockComments` array, no backend table or endpoints |
| View count | Backend endpoint (`POST /videos/{id}/view`) works and is anonymous-friendly, but the watch page never calls it — views aren't actually recorded from this page yet |
| AI features (scene timeline, mood analysis, etc.) | Removed from this page's imports entirely; see [12_AI_FEATURES.md](./12_AI_FEATURES.md) |

One more thing worth flagging for anyone extending this: there are currently **three separate `Video`-shaped TypeScript types** in play — the canonical `lib/types/video.ts` (mirrors the backend response, includes `storyboard_url`), `VideoGrid.tsx`'s own trimmed inline interface (matches the lightweight list response), and the player's narrower `VideoData` in `player/types.ts`. The watch page itself types its fetched video as `any`. None of this breaks anything today, but it means the "one source of truth" type-sync problem flagged in [07_FRONTEND_FOUNDATION.md](./07_FRONTEND_FOUNDATION.md) is, if anything, a little worse here than a single missing function — it's three shapes that can drift independently.

---

## Future Upgrades

- **Wire `incrementVideoView`** — call it from the watch page once playback actually starts
- **Real comments backend** — a `comments` table plus CRUD endpoints; the UI and the auth-gating are already in place
- **Consolidate the `Video` type** — pick one shape (likely `lib/types/video.ts`) and have `VideoGrid` and the player consume it instead of maintaining parallel definitions
- **Backfill storyboards** for videos processed before the scrubbing-preview feature existed
- **Watch history** — prerequisite for "continue watching" and any real recommendations
- **Infinite scroll** — load more videos as the user scrolls down the home feed

---

## What's Next

The home feed and watch page are for anyone, logged in or not. The admin panel is where the people managing the platform live, and everything there still sits behind the auth guard. The next document covers the admin panel structure — what's fully wired up (more than before, including visibility and soft delete), and where the real gaps still are.
