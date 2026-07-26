# 09 - Frontend: Home Feed, Watch Page, and Play Page

After a user logs in, or just as often now without logging in at all, they land on the home feed. From there, clicking a video takes them to a title/detail page, and pressing "Watch Now" takes them to a separate, fully immersive player page. All three of these routes are public, reachable with no account. This document covers what's real, what's still mocked, and how the real parts (the public routing, the video.js player, and the scrubbing-preview thumbnails) actually work.

The watch experience is deliberately split into two routes, modeled on HBO Max rather than the single-page YouTube layout: `/watch/[video_id]` is a title/detail page (backdrop hero, metadata, synopsis, related videos), and `/play/[video_id]` is the actual full-screen player, reached only via a "Watch Now" button. This is movie-only for now; there's no season/episode data model, so a series experience would need real design work before it could reuse this structure.

---

## The Home Feed: `/`

**`app/(public)/(browse)/page.tsx`**

```tsx
export default function HomePage() {
  const [category, setCategory] = useState("all")

  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <div className="w-full px-4 pt-4 pb-12 sm:px-6 lg:px-8">
        <CategoryPills selected={category} onSelect={setCategory} />
        <VideoGrid category={category} />
      </div>
    </div>
  )
}
```

Three components render, all real: `HeroSection`, `CategoryPills`, and `VideoGrid`. Category selection is lifted state, owned by the page and passed down to both `CategoryPills` (the control) and `VideoGrid` (the thing it filters) - clicking a pill actually changes what's shown, not just how the pill itself looks.

The standalone marketing landing page that used to live at `app/(public)/page.tsx` was deleted; this browse feed *is* the root page now. (Its components, `Landing*.tsx`, are still on disk under `app/(public)/_components/` but nothing imports them - the same "orphaned, not deleted" fate as the AI mock components covered in [12_AI_FEATURES.md](./12_AI_FEATURES.md).)

### VideoGrid - real data, real filtering

**`app/(public)/(browse)/_components/VideoGrid.tsx`**

```tsx
const VideoGrid = ({ category }: VideoGridProps) => {
  const { data: videos, isPending, isError } = usePublicVideos(0, 20)
  const filtered =
    !videos || category === "all" ? videos : videos.filter((v) => v.category === category)
  // ...
}
```

`usePublicVideos()` is a TanStack Query hook wrapping `GET /videos/` with `skipAuthRedirect: true` - this flag tells the shared Axios client not to attempt a token refresh or bounce to sign-in if the request comes back unauthenticated, since an anonymous visitor browsing videos should never see a login redirect just because they don't have a token. Filtering happens client-side against the already-fetched list, matched against `category`. The grid renders a skeleton (shaped like the eventual card grid, not a spinner) while loading, and an actionable empty state if the list (or the filtered result) comes back empty. Switching categories remounts the grid (keyed on `category`) and replays a simple `animate-in fade-in` CSS entrance - see the note on animation approach further down for why this isn't GSAP-driven.

### VideoCard - a pure poster tile

**`app/(public)/(browse)/_components/VideoCard.tsx`** - shared by the home feed's grid and the watch page's "You may also like" section.

The card shows the thumbnail only: portrait `aspect-[2/3]`, sharp corners (no `rounded-*` anywhere on the card), a neutral hover ring, and a hover-only bottom gradient with a play glyph. No title, category, view count, or rating is rendered on the card at all - all of that metadata lives exclusively on the detail page now. `aria-label`/`alt` still carry the real title for accessibility even though nothing is shown visually. Clicking navigates to `/watch/{video_id}`.

An always-on gradient scrim was tried here first and reverted: stacked on top of a naturally dark thumbnail (a dim room, a night shot), it pushed the whole card to near-black at rest, which read as worse than no gradient at all.

### HeroSection and CategoryPills

`HeroSection` rotates through the 5 most recent public videos (`ROTATE_MS = 8000`), each with its own backdrop crossfade, an ambient color tint derived from the thumbnail (`useAmbientColor`, same technique as the watch/play pages, see below), a left-anchored fixed-width gradient (not a full-bleed one - see the note in the next section), and a title/metadata/description/tags stack matching the watch detail page's hero almost exactly, down to the same three buttons: Play (→ `/play/{id}`), More info (→ `/watch/{id}`), and a watchlist toggle gated by `useRequireAuth`.

`CategoryPills` is a real, wired filter control: plain-text `Badge` pills for `all`, `action`, `drama`, `comedy`, `scifi`, `thriller`, `documentary`, `fantasy`, `horror` - these values have to match the backend's actual category enum exactly (the same list the upload form's category select uses) or filtering silently matches nothing. Selected state is neutral styling (`border-foreground text-foreground`), not cyan. There's no icon, no morph animation, and no shared registry with the admin category manager - that's `lib/icons/categoryIcons.ts`, used only by the admin Categories UI now.

---

## The Watch Page: `/watch/[video_id]` - title/detail page

**`app/(public)/(browse)/watch/[video_id]/page.tsx`**

This is not a player page. It's a backdrop hero (the video's thumbnail, full-bleed, `min-h-[84vh]`) with the title, an eyebrow metadata line (category · views · release year · age rating), a "Watch Now" button that routes to `/play/{video_id}`, then `VideoInfo` (synopsis, cast, tags) and `RelatedVideos` below the hero. There is no embedded video player anywhere on this page.

```tsx
const WatchPage = ({ params }: { params: Promise<{ video_id: string }> }) => {
  const { video_id } = use(params)
  const { data: video, isError } = useVideo(video_id)
  // ...
  return (
    // hero with backdrop image, gradient, title, metadata, Watch Now button
    // -> VideoInfo -> RelatedVideos
  )
}
```

`useVideo()` is a TanStack Query hook wrapping `getVideoById()` (`GET /videos/by-id/{video_id}`, `skipAuthRedirect: true` for the same anonymous-friendly reason as the feed), and it returns a properly typed `Video`, not `any`.

The hero's gradient is a fixed-width left-side panel (`w-full md:w-2/3 bg-linear-to-r from-background via-background/70 to-transparent`), not a full-bleed gradient with compressed stops - this keeps most of the backdrop artwork clearly visible instead of washing out the whole image, which is what an earlier, full-bleed version did. Content is left-aligned and bottom-anchored, not centered.

### Watch Page Layout

- **Hero** (in `page.tsx` itself) - backdrop image, title, eyebrow metadata, Watch Now button
- **`VideoInfo`** - synopsis (with a director line and a show-more/less toggle), cast badges, tag badges. No Like/Dislike/Watchlist/Follow row exists here anymore - those were removed from this component during the minimalist redesign, since none of them had real backend support (the homepage hero's watchlist toggle is the one surviving gated action, and it lives in `HeroSection`, not here)
- **`RelatedVideos`** - a grid below the hero, same `VideoCard` component as the home feed, filtered to same-category videos first

There is no `CommentSection` on this page. It isn't hidden or unlinked - the component file was deleted outright during the watch-page minimalist redesign, along with five AI mock widgets that used to sit here (`AISceneTimeline`, `AIMoodAnalysis`, `AIRecommendations`, `AIWatchParty`, `AIContentWarnings` - see [12_AI_FEATURES.md](./12_AI_FEATURES.md)). Rebuilding comments means writing a new component, not resurrecting an old one.

A signature visual touch on this page: `useAmbientColor` extracts an average color from the video's thumbnail (client-side, on a 16×16 canvas downsample) and tints the hero to match the content. It fails silently - on a CORS-tainted image or any error, the tint is just absent, never a broken page. Full details in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) §6.

The whole page fades in together on arrival (`usePageFade`, a single uniform tween, not a stagger) rather than cascading its pieces in one at a time - see the animation-approach note below for why.

---

## The Play Page: `/play/[video_id]` - the actual player

**`app/play/[video_id]/page.tsx`** - a top-level route, deliberately outside every route group. Nesting it under `(public)` would have it inherit `(browse)/layout.tsx`'s site navbar, which this page doesn't want: it's meant to be a full-viewport, chrome-free player, not a page with a nav bar floating over it.

The only UI here besides the player itself is a back button (returns to `/watch/{video_id}`) and an age-rating badge, both overlaid top-left on the player. The player fills the entire browser viewport (`h-screen w-full`, `--media-object-fit: cover` set on the wrapper) rather than being letterboxed in a centered `aspect-video` box - that CSS variable is exposed by `player.css` specifically for this, and the player's own `:fullscreen` rule still forces `contain` once a viewer hits the real OS fullscreen button, so that path is unaffected.

---

## The Video Player: Real Playback via `@videojs/react`

**`app/(public)/(browse)/watch/[video_id]/_components/player/`** - the component directory didn't move even though the player itself now only renders on `/play/[video_id]`, not on the watch detail page.

This is a fully working custom HLS player built on **`@videojs/react`** (the `10.0.0-beta` line), with a custom skin (`videojs-skin/Skin.tsx`) built by "ejecting" and modifying video.js's Default Video Skin.

One precision worth holding onto: "migrated to video.js" is true for the ecosystem (the packages are `@videojs/core` and `@videojs/react`, published by the video.js project) but the classic `video.js` npm package itself is only a transitive dependency - nothing imports it directly. If you go looking for `import videojs from 'video.js'`, you won't find it; look for `@videojs/react` instead.

```tsx
// VideoPlayer.tsx
export default function VideoPlayer({ video, className }: VideoPlayerProps) {
  const thumbnails = useStoryboardThumbnails(video.storyboard_url)

  return (
    <VideoJsSkin
      src={storageUrl(video.manifest_url)}
      poster={video.thumbnail_url ? storageUrl(video.thumbnail_url) : undefined}
      thumbnails={thumbnails}
      className={className}
      // ...
    />
  )
}
```

There is no `theater`/`onToggleTheater` prop anymore - theater mode was deleted entirely (`useTheaterMode.ts` and its button in `Skin.tsx`) once the player got its own dedicated, always-full-viewport page at `/play/[video_id]`; a separate theater mode became redundant.

Inside the skin, HLS playback and adaptive quality switching come from `@videojs/react`'s `HlsJsVideo` element:

```tsx
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video'
// ...
<HlsJsVideo src={src} autoPlay playsInline />
```

This is what finally consumes the `master.m3u8` manifest the backend has been generating since the processing pipeline was built.

### Scrubbing-Preview Thumbnails

The timeline's hover/drag preview - the thing that shows a small frame from the video as you scrub - is fed by the storyboard sprite sheets and WebVTT file the `generate_storyboard` Celery stage produces (see [06_VIDEO_PROCESSING_PIPELINE.md](./06_VIDEO_PROCESSING_PIPELINE.md)).

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

If a video was processed before this feature shipped, `video.storyboard_url` is `null`, `useStoryboardThumbnails` returns `undefined`, and the player renders exactly as it did before - no preview strip, no error, no backfill.

**When any spec and the shipped code disagree, the code is what's documented here.** The design spec under `docs/superpowers/specs/2026-07-20-scrubbing-thumbnails-design.md` (a local, git-ignored planning artifact, not part of the tracked repo) is a useful record of the reasoning that led here, but its `<track>`-based proposal is not what's running.

### A note on the animation approach here

Both `/watch` and `/play` fade in as one uniform unit on arrival (`usePageFade`), and the home feed's grid/filter transitions use a plain CSS `animate-in fade-in` rather than a GSAP scroll-triggered reveal. This is a deliberate simplification, not an oversight: an earlier version wired `useScrollReveal` (a GSAP `.from()` tween gated on a `ScrollTrigger` condition) into the card grids, and it caused cards to become permanently stuck at `opacity: 0` whenever the trigger's "has this scrolled into view" condition didn't fire the way the code expected - which happened often enough, across different viewport sizes and reload timings, to be a real recurring bug rather than an edge case. The fix was to stop gating a browsing grid's visibility on a JS condition at all. `useScrollReveal.ts` itself still exists in the codebase (unused by any live page now) if you want to see the mechanism that caused this.

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

It's used in exactly one place today: **`HeroSection.tsx`**, gating the homepage hero's watchlist "+" button. `VideoInfo.tsx` has no interactive gated controls at all anymore - Like, Dislike, Watchlist, and Follow were all removed from it during the minimalist watch-page redesign, since none had real backend support behind them. A logged-out click on the gated watchlist button routes to `/auth/sign-in?next=<current-path>`, so a successful sign-in returns the viewer to the exact page they were on.

---

## What's Still Mock or Incomplete Here

Being direct about the remaining gaps, since that candor is this document's whole point:

| Area | Status |
|---|---|
| Home feed (`VideoGrid`), category filtering | Real - fetches `GET /videos/`, filters client-side against a real category enum |
| Watch page video fetch | Real - `useVideo()` / `getVideoById()`, properly typed, no `any` |
| Video playback | Real - `@videojs/react` + HLS, adaptive quality, on its own dedicated `/play/[video_id]` page |
| Scrubbing-preview thumbnails | Real, for videos processed after the storyboard stage shipped |
| Watchlist toggle | Gated correctly for logged-out users (`HeroSection` only); no evidence of a backend behind the action itself beyond the gate |
| Comments | Not started - the component that used to render hardcoded mock data was deleted outright, not left as a mock; there's no UI and no backend |
| View count | Backend endpoint (`POST /videos/{id}/view`) works and is anonymous-friendly, but nothing in the frontend calls it - views aren't actually recorded yet |
| AI features (scene timeline, mood analysis, etc.) | Removed from every page's imports entirely; see [12_AI_FEATURES.md](./12_AI_FEATURES.md) |

---

## Future Upgrades

- **Wire `incrementVideoView`** - call it from the play page once playback actually starts
- **Real comments backend** - a `comments` table plus CRUD endpoints, and a new comments component (the old one is gone)
- **Backfill storyboards** for videos processed before the scrubbing-preview feature existed
- **Watch history** - prerequisite for "continue watching" and any real recommendations
- **Infinite scroll** - load more videos as the user scrolls down the home feed
- **Series/season/episode support** - the `/watch` vs `/play` split is movie-only today; a real content model would be needed before extending this to series

---

## What's Next

The home feed and watch page are for anyone, logged in or not. The admin panel is where the people managing the platform live, and everything there still sits behind the auth guard. The next document covers the admin panel structure - what's fully wired up (more than before, including visibility and soft delete), and where the real gaps still are.
