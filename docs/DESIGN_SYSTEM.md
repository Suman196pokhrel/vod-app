# VOD Design System — Source of Truth

> This document is the **single authority** for all UI work in this codebase.
> If a change conflicts with this document, the change is wrong.
> Reference implementations: `VideoPlayer.tsx`, `VideoCard.tsx`, `useAmbientColor.ts`.

---

## 1. Identity

Open-source, self-hostable VOD platform. The flagship instance is a curated library.

**Adjectives:** minimalist, vibrant, adaptive, fluid, fast, immersive.
**Anti-adjectives:** dense, noisy, corporate, playful.

**One-line direction:** a quiet, near-black gallery where content glows and the
interface only speaks when touched — and when it speaks, it is fast and cyan.

Influences (from reference research):
- **MUBI** → surfaces, spacing, editorial ALL-CAPS metadata, separation by space not borders
- **YouTube** → watch-page information stack (title → actions row → description → comments)
- **Netflix** → confidence through scale and darkness, embraced fully for the hero
  banner and watch-page atmosphere (2026-07-27: cinematic pass) — large-scale
  cinematic backdrops, edges that dissolve into the background rather than cut off,
  page-wide ambient tint. Still explicitly **NOT** its red, and still **NOT** its
  hover-preview/mega-expand card mechanic (autoplaying clip + expanding card on
  hover) — that stays out of scope everywhere in this app; see the Motion table below.
- **Twitch** → rejected: accent-by-coverage. Our accent works by contrast, not coverage.

**Signature element:** the ambient glow — every watch page is tinted by the video's
own artwork (see §6), and as of the cinematic pass, so is the browse-page hero.
This is the one place the design is allowed to be atmospheric.

---

## 2. Tokens

All tokens live in `app/globals.css`. Components consume them **only** via
Tailwind classes or `var(--token)`. There is one theme: dark. No light mode.

### Surfaces
| Token | Value | Use |
|---|---|---|
| `--background` | `#0A0A0B` | app background |
| `--card` | `#141416` | cards, rows |
| `--popover` | `#1C1C1F` | menus, dialogs, elevated |
| `--surface-watch` | `#000000` | watch page only — "lights off" |

### Text (three steps, never more)
| Token | Value | Use |
|---|---|---|
| `--foreground` | `#FAFAFA` | primary text |
| `--muted-foreground` | `#A1A1AA` | secondary: metadata, descriptions |
| `--text-subtle` | `#52525B` | tertiary: timestamps, placeholders |

### Accent — electric cyan
| Token | Value | Use |
|---|---|---|
| `--primary` | cyan-400 `#22D3EE` | ONLY: seek/progress bars, active states, focus rings, primary CTA, live badges |
| `--primary-foreground` | `#083344` | text on cyan |

**Accent law:** cyan is never a background surface, never body text, never borders
at rest. If a screen has more than ~3 cyan elements visible, remove some.

### Borders
`--border` `#27272A`. Use only where unavoidable (inputs, menus). Default
separation is spacing + surface steps, not lines.

### Radius
`--radius: 0.5rem` (cards, media) / `calc(--radius - 2px)` (controls).
Full-round for avatars only.

### Typography
- **Display:** Space Grotesk (`--font-display`) — page titles, video titles, hero
- **UI/body:** Geist (`--font-sans`) — everything else
- **Eyebrow style** (`.eyebrow` utility): 11px, ALL-CAPS, `tracking-[0.14em]`,
  `--muted-foreground`. Use for section headers and metadata rows (MUBI-style).
- Weights: 400 body / 500 UI emphasis / 600 titles. Nothing bolder.

### Motion
| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 150ms | hover, focus, small state |
| `--duration-base` | 200ms | overlays, menus, controls reveal |
| `--duration-slow` | 300ms | page-level transitions |
| `--duration-cinematic` | 600ms | hero backdrop crossfade, ambient vignette fade — the hero/watch atmosphere ONLY, never an ordinary control |
| `--ease-out-quart` | `cubic-bezier(0.2, 0, 0, 1)` | the ONLY easing curve — `--duration-cinematic` reuses it too, no second curve |

Rules: every interactive element has a visible hover/focus response within 150ms.
Card hover = `-translate-y-1` + `scale-[1.02]` + `bg-accent/60` wash + accent
underline on title + deeper shadow (`shadow-2xl shadow-background/60`) at
`--duration-base`, not `--duration-fast` — the cinematic pass slowed card hover
by one token step for a more deliberate, premium feel. Still no parallax, no
bounce, and still no Netflix mega-expand (autoplaying hover-preview clip +
expanding card) — that interaction is explicitly out of scope. Respect
`prefers-reduced-motion` (handled in globals).

### Loading
Never spinners for content areas — **skeletons** (`.skeleton` utility) shaped like
the content they replace. Spinners only inside buttons and the video player.

---

## 3. Hard rules for automated changes (agent contract)

1. **No raw color values in components.** No hex, no `text-red-600`, no arbitrary
   `text-[#22D3EE]`. Tailwind semantic classes (`bg-card`, `text-muted-foreground`,
   `bg-primary`…) or `var(--token)` only. The ONE exception: `useAmbientColor`
   output applied as inline style.
2. **No new font sizes or weights** outside the scale in §2.
3. **No one-off animation durations/easings** — tokens only.
4. **Build from themed shadcn primitives** (`components/ui/*`). Do not hand-roll
   buttons, menus, inputs. If a primitive is missing, add it via shadcn CLI first.
5. **Do not restyle mock/fictional components** (MoodSelector, ContinueWatching,
   Top10ThisWeek, AIWatchTimeBanner, ContentJourney, QuickAccessSidebar,
   PersonalizedRow, DevelopmentHero) — **delete their imports/usage** from pages.
   Real surfaces polished > fake surfaces themed.
6. Every media/thumbnail container declares `aspect-video` and a `bg-card`
   placeholder state.
7. Keyboard focus must remain visible everywhere (`focus-visible` ring is themed —
   do not remove outlines).
8. Copy: sentence case, active voice, verbs on buttons ("Save changes", not
   "Submit"). Errors say what happened and what to do. Empty states invite action
   ("No videos yet. Upload one to get started.").

---

## 4. Reference implementations

| File | Demonstrates |
|---|---|
| `VideoPlayer.tsx` | watch surface (#000), cyan seek/progress, controls reveal timing, quality menu |
| `VideoCard.tsx` | card surface, hover elevate + scale + accent underline, eyebrow metadata, skeleton |
| `lib/motion/useAmbientColor.ts` | ambient tint extraction (§6) — shared by the watch page and the browse-page hero |
| `lib/motion/useStaggeredReveal.ts` | cinematic content load-in — ref-returning GSAP hook, stagger-reveals a container's direct children, `prefers-reduced-motion`-safe. Used by `HeroSection.tsx` and the watch page |
| `_components/HeroSection.tsx` | cinematic hero — real data via `usePublicVideos`, backdrop crossfade, ambient tint, vignette gradients |

When restyling any other component, match these patterns before inventing new ones.

---

## 5. Surface-by-surface application order

Work top to bottom. One surface per PR/commit.

1. **Tokens land** — replace `globals.css`, install fonts in `layout.tsx`
   (`next/font/google`: Space_Grotesk + Geist), verify existing shadcn components
   pick up the theme.
2. **Watch page** — pure-black `--surface-watch` background, ambient glow behind
   player (§6), YouTube-order info stack, eyebrow metadata row
   (CATEGORY · VIEWS · DATE), skeleton for loading state.
3. **Browse/home grid** — delete mock components (rule 3.5), MUBI spacing
   (`gap-6`+ between cards, generous section padding), eyebrow section headers,
   card skeletons while loading.
4. **Upload / studio flow** — themed form primitives, upload progress uses
   `--primary`, processing status as quiet eyebrow text + progress, success state
   links to watch page.
5. **Auth screens** — centered card on `--background`, display-font heading,
   single cyan primary CTA per screen.
6. **Empty/error/loading states everywhere** — audit every data surface for the
   three states; apply §2 Loading and §3.8 copy rules.

---

## 6. Ambient system (signature)

Hook: `useAmbientColor(imageUrl)` → returns `{ color }` (average color of the
thumbnail, computed client-side on a 16×16 canvas downsample).

Usage (watch page):
```tsx
const { color } = useAmbientColor(video.thumbnail_url ? publicUrl(video.thumbnail_url) : null)

<div className="relative">
  <div
    aria-hidden
    className="pointer-events-none absolute -inset-8 -z-10 rounded-[2rem] opacity-[0.16] blur-3xl transition-[background] duration-300"
    style={{ background: color ?? "transparent" }}
  />
  <VideoPlayer video={video} />
</div>
```

Constraints:
- Image element must load with `crossOrigin="anonymous"`; storage responses must
  be CORS-readable (MinIO default allows `*` for anonymous GET — verify in prod).
- Fail silent: on CORS taint or error, `color` stays `null` and the page renders
  identically minus the glow. The glow is enhancement, never a dependency.
- Opacity stays ≤ 0.2. The glow is felt, not seen.

**Page-wide variant (`.ambient-glow-page`, added in the cinematic pass):** the
watch page now also sets `--ambient` on its outermost wrapper (not just the
player-local glow div), so a second, fainter, more heavily blurred layer
(`opacity: 0.08`, `blur(120px)`, `fixed inset-0 -z-10`) can spread the same tint
across the whole viewport instead of leaving it pooled around the player. Same
`--ambient` variable, so the two layers always agree on color — never introduce
a second color source for this. The hero's own ambient tint (`HeroSection.tsx`)
is a simpler one-off `opacity-[0.16]` div reading `color` directly via inline
style, since the hero doesn't need a second, page-wide layer the way the watch
page's sidebar/info column does.

---

## 7. Route restructure (public-first) — engineering spec

Identity C decision: **content is public, actions require auth** (YouTube model).

Target state:
- `GET` browse + watch pages publicly accessible: move `home/` and
  `home/watch/[video_id]/` out of the `(protected)` route group into a public
  group (e.g. `(public)/` or root). Keep upload, studio/admin, profile under
  `(protected)`.
- Middleware/auth guard: stop redirecting unauthenticated users from browse/watch;
  keep guarding upload/admin/profile routes.
- API client: browse/watch fetches must not hard-fail without a token. Backend:
  `GET /videos/` is already public; **`GET /videos/by-id/{id}` currently requires
  auth — change to optional auth** (public videos readable by anyone; private
  videos only by owner). This is a backend change; coordinate schema of "private
  video, not owner" → 404 (not 403, don't leak existence).
- Header UI: logged-out shows "Sign in" button (ghost) + primary CTA only where
  an action needs it; logged-in shows avatar menu. Like/comment/subscribe
  controls render for everyone but clicking while logged out routes to sign-in
  with `?next=` return path.
- Watch page view-count increment (`POST /videos/{id}/view`) must work
  unauthenticated (or be dropped for anon) — verify backend.

Order: do §5.1–5.3 (visual system) first, then this section as its own work item
— it touches middleware, route groups, and one backend endpoint, and should not
be mixed into styling commits.

---

## 8. Verification checklist (run after each surface)

- [ ] Zero raw hex / palette-class colors introduced (`grep -rn "text-red\|bg-red\|#[0-9a-fA-F]\{6\}" app/` on changed files — only tokens file may match)
- [ ] Hover + focus states respond ≤150ms with the standard curve
- [ ] Loading state is a skeleton shaped like the content
- [ ] Empty state has copy inviting action
- [ ] Keyboard-only pass: all interactive elements reachable, focus visible
- [ ] Mobile pass at 390px: no horizontal scroll, player controls usable
- [ ] Cyan count on screen ≤ ~3 at rest
