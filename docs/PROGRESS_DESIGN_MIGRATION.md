# Design System Migration — Progress Tracker

Source of truth: [`docs/DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md). Reconciliation
decisions and scope: [`docs/superpowers/specs/2026-07-19-frontend-design-system-migration-design.md`](./superpowers/specs/2026-07-19-frontend-design-system-migration-design.md).

All file paths below are relative to the `app/` package (Next.js App Router root
is `app/app/` on disk — there's a nested `app/` directory — but paths are
written the way the rest of the docs reference them, e.g. `app/(protected)/...`).

Run the doc's §8 verification checklist against each step before checking it done.

**Status: every user-facing surface in the app (public, protected, and admin)
is now on the unified dark/cyan design system.** Steps 0–9 below are all
done. Only the backend-touching §7 route restructure remains deferred.

---

## Step 0 — Tokens + fonts land globally ✅ done

- [x] `app/globals.css`: merge new dark/cyan tokens into `:root` (surfaces, 3-step
      text scale, `--primary` cyan, functional colors, chart-1..5, radius,
      motion durations/easing, `--ambient`). Drop `.dark {}` block (dead —
      no `next-themes` provider exists). Drop `--sidebar-*` (confirmed unused
      by any component). **Keep `--landing-*`** until Step 4 migrates its
      consumers off it. Add new utilities: `.eyebrow`, `.skeleton` (+shimmer
      keyframes), `.surface-watch`, `.ambient-glow`, `prefers-reduced-motion`
      block. Keep existing keyframes/utilities still in use
      (`animate-shimmer`, `bg-noise`, `bg-grid`, `animate-grid-sweep`,
      float/spin/gradient/slide/fade/ping keyframes).
- [x] `app/layout.tsx`: add `Space_Grotesk` via `next/font/google`, variable
      `--font-space-grotesk`. Keep existing `--font-geist-sans`/`--font-geist-mono`
      variable names (no rename). Update `@theme inline` in `globals.css` so
      `--font-sans` → `--font-geist-sans`, `--font-display` →
      `--font-space-grotesk, --font-geist-sans`.
- [x] Add `--color-surface-watch`, `--color-subtle` to the `@theme inline`
      mapping block; remove the `--color-sidebar-*` entries.
- [x] `pnpm build` succeeds, `pnpm lint` clean (on touched files — repo has
      pre-existing unrelated lint errors in auth store / video api / hooks).
- [x] **Browser check:** logged in via claude-in-chrome, checked `/home` and
      `/admin/videos/upload`. shadcn primitives (button, input, avatar,
      dropdown, scroll-area) render correctly against the new dark/cyan
      tokens, admin sidebar + upload dropzones auto-inherited cyan accents
      with zero code changes, zero console errors.

## Step 1 — Watch page ✅ done

- [x] Ambient glow: ported `useAmbientColor` hook verbatim into
      `_components/player/useAmbientColor.ts`; wired into `page.tsx` behind
      the player with the `.ambient-glow` utility + `--ambient` inline style.
- [x] Retinted the player subsystem from violet to `--primary` cyan; raw
      `white`/`black` opacity utilities → `foreground`/`surface-watch`/
      `popover`/`accent` tokens across `VideoPlayer.tsx`, `ControlBar.tsx`,
      `ScrubBar.tsx`, `VolumeControl.tsx`, `SettingsMenu.tsx`,
      `TheaterButton.tsx`, `CenterPlayButton.tsx`, `PlayPauseFlash.tsx`,
      `BufferingSpinner.tsx`. Kept the existing overlay-controls UX (more
      capable than the zip's reference file) — retint only. Also fixed a
      pre-existing bug where `VideoPlayer`'s `className` prop was accepted
      but never applied (theater-mode sizing was silently ignored). Deleted
      the dead, unused `_components/VideoPlayer.tsx` (superseded by
      `_components/player/VideoPlayer.tsx`, confirmed via grep zero
      importers).
- [x] Restyled `VideoInfo.tsx` (eyebrow metadata row, `bg-card` surfaces,
      `.eyebrow` section headers for Cast/Tags), `VideoStats.tsx` (already
      token-clean, no changes needed), `CommentSection.tsx` (already
      token-clean), `RelatedVideos.tsx` (hover→`accent`, duration badge→
      `surface-watch/70`, star rating→`muted-foreground`, dropped stray
      `font-bold` on headings so the base-layer `h1/h2/h3{font-weight:600}`
      rule applies instead of 700).
- [x] Deleted the 5 AI mock widgets from `page.tsx`: `AISceneTimeline`,
      `AIMoodAnalysis`, `AIRecommendations`, `AIWatchParty`,
      `AIContentWarnings` (imports + JSX usage removed; component files left
      in place, per doc §3.5's literal wording).
- [x] `pnpm build` clean. Browser check via claude-in-chrome on a real
      uploaded video: pure-black surface, cyan scrub-bar progress + thumb,
      eyebrow metadata (`ACTION · 0 VIEWS · 2026 · R`), popover scrub-hover
      tooltip, hover-accent tint on control icons and related-video cards,
      zero console errors.

## Step 2 — Browse/home grid ✅ done

- [x] Deleted 8 mock components from `app/(protected)/home/page.tsx`
      (imports + JSX): `DevelopmentHero`, `AIWatchTimeBanner`, `MoodSelector`,
      `MoodSelectorCompact`, `ContinueWatching`, `Top10ThisWeek`,
      `ContentJourney`, plus the already-commented `PersonalizedRow` /
      `QuickAccessSidebar` imports. Page simplified to a single-column
      HeroSection → CategoryPills → VideoGrid layout (no sidebar left to
      justify the old 2-column grid).
- [x] Restyled `VideoCard.tsx` to the reference pattern (hover
      `scale-[1.02]` + accent underline, eyebrow metadata, `VideoCardSkeleton`
      export) — also stripped the stray `console.log` debug lines.
- [x] Restyled `VideoGrid.tsx` (eyebrow "Browse videos" header, skeleton grid
      while loading, `gap-6 sm:gap-8`, improved error copy), `HeroSection.tsx`
      (raw `white`/`black` → `foreground`/`surface-watch` tokens, dropped
      `font-bold` on the `h1`, star rating → `muted-foreground`),
      `CategoryPills.tsx` (hover → `accent`, motion tokens) — both already
      mostly token-driven.
- [x] `pnpm build` clean. Browser check: mock sections gone, real
      "Browse videos" grid renders 3 uploaded videos with working hover
      (scale + cyan underline), cyan selected category pill, zero console
      errors.

## Step 3 — Upload / studio flow ✅ done

- [x] `upload/page.tsx` and `_components/uploadForm/{UploadForm,
      BasicInformationSection,AdditionalDetailsSection,PublishingSection,
      FormActions,TagInput,UploadError}.tsx` — grepped for raw colors, found
      none (already shadcn `Card`/`Field`/`Select` primitives, fully
      token-inherited). Only fix needed: dropped `font-bold` on the
      `upload/page.tsx` `<h1>`.
- [x] `ThumbnailUploadZone.tsx`, `VideoUploadZone.tsx` — grepped clean, dropzone
      states already reference `border-primary`/`bg-primary/5`/`bg-primary/10`
      tokens, confirmed cyan in browser.
- [x] Reworked `_components/multi_step_progress/{phase-item,video-processing-dialog}.tsx`
      — removed all purple/blue/green/gray hardcoded colors. Progress bar
      and active/complete phase icons → solid `--primary` cyan (no
      gradients, per accent law); phase label → `.eyebrow`. Dialog surface
      → `bg-popover`; success alert → neutral `bg-card`/`border-border` with
      a cyan check icon (no success token exists in the design system, so
      no color was invented); error alert → `bg-destructive/10` (the
      sanctioned destructive token). Buttons stripped of hand-rolled
      gradient overrides to fall back to themed shadcn `Button` variants
      (rule 4). Removed an unused `Progress` import as a minor cleanup.
- [x] `pnpm build` clean. Browser check on `/admin/videos/upload`: full form
      (video/thumbnail dropzones, basic info, additional details,
      publishing, actions) renders correctly with cyan accents throughout,
      zero console errors. (Processing dialog verified by code review only —
      triggering it live requires a real backend upload+transcode round
      trip, not exercised in this pass.)

## Step 4 — Auth screens + landing page ✅ done

- [x] Migrated `app/(public)/auth/_components/AuthPageShell.tsx` off
      `--landing-*` onto unified tokens (`bg-background`, `text-foreground`,
      `border-border`, `text-muted-foreground`).
- [x] Migrated `components/signin-form.tsx`, `components/signup-form.tsx` off
      `--landing-*` onto unified tokens — mechanical swap plus dropped
      `font-bold` headings (base layer already sets 600) and hardcoded
      `fill="#0a0a0a"`/`stroke="#0a0a0a"` SVG icon fills → `var(--background)`
      inline style (no Tailwind class exists for raw SVG attrs).
- [x] Reworked `SuccessCard.tsx`, `forgot-pw/page.tsx`,
      `reset-password/page.tsx` — these were on an **older** hardcoded
      slate/violet/indigo/emerald/rose palette (raw `rgba()` shadows,
      `bg-white`), not `--landing-*` at all. Brought onto unified tokens:
      `bg-card`/`border-border` surfaces, solid `bg-primary` CTAs (no
      gradients), `text-destructive` errors. `SuccessCard`'s emerald
      "success" treatment has no equivalent token in the design system, so
      it maps to neutral `bg-accent`/`text-primary` rather than inventing a
      green.
- [x] Reworked `verify-email/page.tsx` — third, fully orphaned style
      (`bg-gray-50`, `blue-600`/`green-600`/`red-600`). Brought onto unified
      tokens (`text-primary`/`text-destructive`/`text-muted-foreground`) and
      wrapped in `AuthPageShell` so it matches the other auth screens'
      layout instead of standing alone.
- [x] Migrated landing components off `--landing-*`: `LandingNav.tsx`,
      `LandingHero.tsx`, `LandingHeroBackdrop.tsx` (radial highlight
      hardcoded `#ffffff` → `var(--foreground)`), `LandingHeroDevice.tsx`,
      `LandingFeatures.tsx`, `LandingCTA.tsx`, `app/(public)/page.tsx`.
      `VibeLogo`'s `mono` prop already uses `currentColor`/`text-current` —
      no changes needed there, just updated the wrapping element's
      text-color class from `text-landing-fg` to `text-foreground`.
- [x] Removed `--landing-*` tokens and their `@theme inline` mappings from
      `app/globals.css` — confirmed via
      `grep -rln "landing-bg\|landing-fg\|landing-muted\|landing-border\|landing-elevated" app/ components/`
      returning only `globals.css` itself before removal, zero hits after.
- [x] `pnpm build` clean. Browser check on `/`, `/auth/sign-up`,
      `/auth/forgot-pw`, `/verify-email`: landing hero/features/CTA, sign-up
      form, forgot-password form, and verify-email error state all render
      as one consistent dark+cyan system (previously 3 different visual
      eras: `--landing-*` monochrome, slate/violet/indigo, and orphaned
      gray/blue/green). Zero console errors. Pre-existing lint issues in
      touched files (`any` types, unused vars, `verifyEmail` hoisting order)
      confirmed unrelated to this change — same in the original source.

## Step 5 — Empty / error / loading audit ✅ done

- [x] Swept all surfaces touched in Steps 1–4 for the three states. Found and
      fixed two gaps missed in earlier steps:
      - `HomeNavbar.tsx` (renders on every protected page via
        `(protected)/layout.tsx`, wasn't on any step's explicit file list) —
        notification dot was raw `bg-red-500`, moved to `bg-primary`.
      - Watch page (`page.tsx`) initial-load state was bare `Loading…` text,
        not a skeleton — replaced with a content-shaped skeleton (player
        aspect-video block + title/metadata bars + sidebar bars) per doc §2.
        Error copy also tightened to say what happened and what to do
        ("Video not found. Try going back and selecting another video.").
      Confirmed already-compliant: `VideoGrid` empty/error copy invites
      action ("No videos yet. Upload one to get started." /
      "Couldn't load videos. Try refreshing the page."), upload form's
      `isSubmitting` state is text-only inside a button (spinners-in-buttons
      is explicitly allowed). *(Superseded by Step 8: `RelatedVideos` now
      runs on real data with a real empty state; `CommentSection` was
      deleted outright rather than migrated — see Step 8.)*
- [x] Ran the doc §8 checklist:
      - Raw-color grep across every file touched in Steps 0–5 (excluding the
        deferred admin dashboards): zero hits outside `globals.css` (whose
        only matches are hex values inside comments documenting the oklch
        tokens, which the checklist itself allows).
      - Keyboard-only pass: tabbed through the home page — cyan
        `:focus-visible` ring appears correctly on the notification bell
        (inherited from the themed base-layer rule, not per-component CSS,
        so it holds everywhere by construction).
      - Cyan-count-at-rest spot check: home hero (1 CTA), browse grid (0 at
        rest, cyan only on hover), watch page (1, the scrub-bar fill) — all
        within the ≤3 budget.
      - Mobile-width pass: attempted via browser automation `resize_window`
        to 390px, but the tooling's window floor in this environment didn't
        go below ~941px viewport — true 390px verification wasn't achievable
        this session. All touched layouts use the pre-existing mobile-first
        Tailwind patterns (`grid-cols-1` base with `sm:`/`lg:` breakpoints)
        already in place before this migration, and nothing in these changes
        altered breakpoint logic, but this specific check is **unverified**
        and worth a manual pass.
- [x] Corrected `CLAUDE.md`'s stale "Known Issues" entries — removed the
      "video player is a UI mock" and "VideoGrid renders 1 hardcoded video"
      lines (both false; confirmed real/API-wired while reading the code for
      this migration) and replaced with an accurate note about the AI mock
      component files being orphaned (not deleted, just unlinked from pages).
      `CLAUDE.md` is gitignored/local-only in this repo, so this edit isn't
      part of any commit.

---

## Step 6 — Icon & micro-animation system (emoji removal) ✅ done

Separate follow-up task, not part of the original §5 rollout: replaced
childish/arbitrary emoji with a themed lucide-react icon system, with true
SVG shape-morphing on hover/select via GSAP `MorphSVGPlugin` (now fully free,
bundled in the `gsap` package already installed — confirmed via GSAP/Webflow's
2025 licensing change, no Club GSAP token needed).

- [x] New dependency: `@gsap/react` (official GSAP React hook).
- [x] `lib/motion/MorphIcon.tsx` — true path-to-path morph between two lucide
      icons. Multi-shape icons are merged into one `<path>` first (via
      `MorphSVGPlugin.convertToPath(..., true)`, `swap: true` required —
      `false` silently no-ops the DOM replacement, was a real bug caught in
      browser verification) so every morph is a clean single-path tween
      regardless of source icon complexity. Falls back to an instant swap
      for `prefers-reduced-motion`.
- [x] `lib/motion/IconSwap.tsx` — GSAP scale+rotate+fade crossfade (not a
      true morph) for icons too structurally different to morph predictably
      — lucide's player-control icons (Play/Pause, Volume2/1/X) have varying
      compound-shape counts, so a tuned pop-swap reads smoother than forcing
      point-correspondence morphing on them.
- [x] `lib/icons/categoryIcons.ts` — shared 12-icon genre registry
      (`CATEGORY_ICONS`, `CATEGORY_ICON_LABELS`) used by both the home
      CategoryPills filter and the admin category manager.
- [x] `home/_components/CategoryPills.tsx` — 12 emoji → lucide icons, each
      morphing into a `Check` on hover/selected.
- [x] `HeroSection.tsx` + watch page `RelatedVideos.tsx` — `★` text glyph →
      `components/icons/RatingStar.tsx` (Star morphs into Sparkles on hover).
      *(Superseded by Step 8: the fabricated rating this displayed had no
      backing field anywhere in the schema — dropped entirely rather than
      kept as decoration, and `RatingStar.tsx` deleted once it had zero
      remaining importers.)*
- [x] Player `ControlBar.tsx` (Play/Pause) and `VolumeControl.tsx`
      (mute/low/high) — wired through `IconSwap`.
- [x] `admin/categories/` — larger scope expansion, confirmed with the user
      first: this surface was still on the pre-migration hardcoded light
      palette (`bg-gray-50`/`bg-white`/`text-gray-900` throughout), so an
      emoji-only swap would've put dark morphing icons on a white page.
      Brought `page.tsx`, `CategoryCard.tsx`, `CategoryDialog.tsx`,
      `CategoryStats.tsx`, `EmptyState.tsx` onto the unified tokens (same
      mechanical pattern as every other surface), replaced the Category
      type's free-form `emoji: string` field with `icon: CategoryIconKey`,
      and swapped the 48-emoji-and-8-color picker for a 12-icon morph-picker
      drawing from the same shared registry. **Product-behavior change:**
      per-category custom color is gone — the design system has exactly one
      accent (cyan) and bans raw palette classes in components, so "pick any
      of 8 colors" was incompatible with the system, not just unstyled; all
      category badges now render with a consistent `bg-accent` surface.
- [x] `pnpm build` clean, zero emoji and zero raw palette classes across
      every touched file (grep-verified). Browser-verified: CategoryPills
      morph (including a real bug fix — the initially-selected "All" pill
      wasn't morphing on mount until the `swap:true` fix above), star
      rating morph, player Play/Pause and Volume crossfades, and the full
      admin category create/edit dialog with live icon-picker + preview.
      Zero console errors throughout.

## Step 7 — Admin dashboard full restyle ✅ done

Separate follow-up task (previously deferred): hand-restyled every remaining
admin surface — dashboard shell, video management, analytics, users,
settings — onto the unified dark/cyan tokens. Categories was already done in
Step 6. Executed in 5 sub-passes, each built + browser-verified +
committed independently:

- [x] **Shell**: `AdminSidebar.tsx` (dropped a hardcoded gradient "VOD" logo
      text and a raw `→` glyph for `ArrowLeft`, added motion tokens),
      `admin/layout.tsx` (loading-spinner colors), `admin/page.tsx`,
      dashboard widgets (`QuickActions`, `RecentActivity`, `RoleBadge`,
      `UserGrowthChart`, `StatsCards`) — all per-widget rainbow icon colors
      (`text-blue-500`, `text-green-500`, `text-purple-500`,
      `text-orange-500`, etc.) collapsed to the single `bg-accent`/
      `text-primary` cyan treatment. `RoleBadge` keeps a real two-way
      distinction (cyan for admin/elevated vs neutral for default) since
      that one carries actual meaning.
- [x] **Videos list**: `VideoTable.tsx`, `data-table.tsx` (already clean),
      `columns.tsx`, `status-badge.tsx`. `status-badge.tsx` was the largest
      single-file color reduction — 11 rainbow-coded pipeline-stage colors
      collapsed to a three-state visual language (neutral+static = queued,
      cyan+pulsing = actively processing, neutral+static = completed,
      destructive = failed) using the pulse itself, not hue, to signal
      "still working." **Also caught a real contrast bug**: the shadcn
      `Tooltip` primitive is intentionally inverted (`bg-foreground`/
      `text-background`), so the qualities-list badges inside it needed the
      same inversion (`border-background/20 text-background`) to stay
      legible — removing the old hardcoded slate override without
      accounting for that made the tooltip's text briefly invisible
      (light-on-light), caught via browser screenshot before commit.
- [x] **Analytics**: `page.tsx` + 6 components. Recharts fills/strokes now
      reference `var(--chart-1)` through `var(--chart-5)` (defined since
      Step 0, confirmed to resolve correctly in SVG presentation attributes
      via browser verification) instead of raw hex. `RealtimeStats.tsx` was
      the single flashiest offender in the whole codebase — a purple/blue
      glassmorphism hero panel with blurred glow orbs and a different raw
      color per stat card — rebuilt as a plain card matching every other
      stat block in this migration; the "LIVE" pulse is the one legitimate
      accent-law use of cyan as a live indicator.
- [x] **Users**: `page.tsx` + `StatCard`/`StatsCards`/`StatusBadge`/
      `UserFilters`/`UserTableRow`. Status/role/engagement-score badges all
      collapse to the same three-state language established in videos'
      status-badge (positive→cyan, negative→destructive, neutral→muted).
- [x] **Settings**: `page.tsx` + `SettingsSection`/`SettingsInputItem`/
      `SettingsSelectItem`/`SettingsSwitchItem`. Removed the `iconColor`
      prop entirely (6 sections each had a different raw color) — every
      section icon now renders identically via the themed
      `SettingsSection` component itself.
- [x] Repo-wide verification: zero emoji, zero raw palette color classes
      across every live (non-orphaned) admin file — confirmed by grep.
      The only two remaining hits are legitimately inert: `AdminHeader.tsx`'s
      `bg-red-500` sits inside a commented-out JSX block (dead), and
      `VideoStats.tsx`/`VideoFilters.tsx` have zero importers anywhere in
      the app (orphaned, never rendered) — consistent with this migration's
      established policy of not restyling dead code. `pnpm build` clean,
      lint shows only pre-existing unrelated issues (verified via
      `git diff` — same lines flagged before these changes), zero console
      errors across every route re-checked in the browser.

## Step 8 — Cinematic pass: hero real data + Netflix-influenced atmosphere ✅ done

Follow-up requested directly by the user (not part of the original §5 rollout):
replace the hero's remaining mock data with real videos via TanStack Query, and
lean further into the Netflix influence (§1) for the browse-page hero and the
watch page specifically — cinematic scale, edges dissolving into the
background, a page-wide ambient tint — while explicitly keeping the
hover-preview/mega-expand card mechanic out of scope (confirmed with the user).

- [x] `HeroSection.tsx` — the last mock data left on any live surface (a
      hardcoded `featuredVideos` array of fake titles + Unsplash stock
      photos) replaced with real videos via the new `usePublicVideos` hook.
      Featured rotation = the 5 most-recent public videos (`get_public_videos`
      already orders by `created_at desc`; there's no admin curation feature
      yet to source a real "featured" flag from). Real fields only — dropped
      the fabricated star rating entirely (no rating field exists anywhere in
      the schema) rather than inventing one. Backdrop now cross-fades between
      rotations via GSAP (`useLayoutEffect`, not `useEffect`, so the
      fade-from-transparent state applies before paint — avoids a one-frame
      flash of the new image at full opacity). Ambient tint (§6) now reaches
      the hero too. Clean empty state ("Nothing here yet. Check back soon.")
      instead of ever rendering the slideshow with no data.
- [x] `usePublicVideos` (`hooks/video/use-public-videos.ts`) — shared TanStack
      Query hook, one query key for `HeroSection`, `VideoGrid`, and
      `RelatedVideos`. All three request the same skip/limit page, so they
      dedupe into one network request (`staleTime: 60s`) instead of each
      firing its own fetch — the "batch API calls" ask from the brief.
      `VideoGrid.tsx`'s previous manual `useEffect`/`useState` fetch is gone;
      `RelatedVideos.tsx`'s previous *separate* `getPublicVideos` call
      (duplicate network request, and typed against the wrong, too-broad
      admin `Video` type) now shares the same hook and the new, correctly-
      shaped `PublicVideo` type (`lib/types/video.ts`) matching what
      `GET /videos/` actually returns.
- [x] `use-video.ts` (`hooks/video/`) — same treatment for the watch page's
      single-video fetch (`getVideoById`), replacing its own manual
      `useEffect`/`useState`. `retry: false` preserves the original
      fail-immediately behavior (no retry loop before showing "not found").
- [x] `VideoCard.tsx` — hover treatment slowed from `--duration-fast` to
      `--duration-base` and given a `-translate-y-1` lift + deeper shadow +
      a hover-revealed bottom gradient, for a more deliberate/premium feel
      than the flat `scale-[1.02]` alone. Still no hover-preview/expand.
      (Caught and fixed during self-review: the gradient/shadow were
      initially written with raw `black`, which the doc's hard rule 1
      forbids — moved to the `--background` token, same visual result.)
- [x] Watch page (`page.tsx`) — `--ambient` now set once on the page's
      outermost wrapper (previously only on the player-local glow div) so a
      new `.ambient-glow-page` layer (`globals.css`) can spread the same tint
      thinly across the whole viewport (`opacity: 0.08`, `blur(120px)`,
      fixed, `-z-10`) rather than leaving the atmosphere pooled around the
      player. Page content (player/info/related columns) now reveals via the
      new `useStaggeredReveal` hook on load and on video-to-video navigation.
- [x] New motion primitive: `lib/motion/useStaggeredReveal.ts` — generic,
      ref-returning GSAP stagger-reveal for a container's direct children,
      reused by both `HeroSection.tsx` and the watch page rather than writing
      two bespoke reveal effects. `prefers-reduced-motion`-safe, matching the
      existing `useScrollReveal` hook's pattern.
- [x] `useAmbientColor` moved from `watch/[video_id]/_components/player/` to
      `lib/motion/` — it now has two consumers (hero + watch page) instead of
      one, so a page-private location no longer fit. Confirmed the old
      `useHeroIntro.ts` motion hook (a *different*, still-imported hook, used
      by the orphaned-but-still-compiling `LandingHero.tsx`) was left
      untouched — reused where the shape genuinely matched, never modified
      code that something else still depends on.
- [x] New token: `--duration-cinematic` (600ms) — hero backdrop crossfade and
      the ambient vignette's fade, reusing the existing `--ease-out-quart`
      curve (no second easing curve introduced). Scoped explicitly to
      hero/watch atmosphere in `DESIGN_SYSTEM.md` §2, not a general-purpose
      addition to the three UI-interaction speeds.
- [x] Dead-code sweep triggered by this pass: `RatingStar.tsx` deleted
      (orphaned the moment `HeroSection.tsx`'s fake rating display was
      removed — confirmed zero remaining importers via grep).
      `CommentSection.tsx` (100% mock data — hardcoded names/avatars/like
      counts, a comment box that didn't persist anything) deleted from the
      watch page in the same work session, ahead of this pass.
- [x] `docs/DESIGN_SYSTEM.md` updated: §1 Influences (Netflix embrace now
      explicit for hero/watch, mega-hover/expand still explicitly out),
      §2 Motion table (`--duration-cinematic`, card-hover rule), §4 Reference
      implementations, §6 Ambient system (page-wide variant documented).
- [x] `pnpm build` clean (re-verified after the raw-color fix above), raw-color
      grep clean across every file touched this pass. **Not verified this
      pass:** a live browser check — the Claude-in-Chrome extension wasn't
      connected in this session, so verification was curl (both pages return
      200, no error strings in the served HTML) plus a careful manual
      line-by-line re-read of the changed files, not an actual rendered
      screenshot. Worth a real browser pass before considering this
      surface fully verified, the same way every earlier step in this
      document was.

## Step 9 — Watch-page minimalist pass + shared premium card ✅ done

Follow-up requested directly by the user, sequenced explicitly after Step 8:
pivot the watch page from a YouTube-style layout (actions row, comment-adjacent
info stack) to a minimal-but-premium Netflix/VOD style, delete every remaining
dead/mock file on that page, then return to the browse grid's cards and give
them the "premium, faded gradient" treatment the user said Step 8 hadn't fully
delivered.

- [x] Deleted 5 orphaned AI-mock files outright (not just unlinked, per the
      user's explicit "no dead code or mock items" instruction, which
      supersedes Step 1's older "leave orphaned" wording for this directory):
      `AISceneTimeline.tsx`, `AIMoodAnalysis.tsx`, `AIRecommendations.tsx`,
      `AIWatchParty.tsx`, `AIContentWarnings.tsx`. All confirmed zero
      importers via grep before deletion. `docs/12_AI_FEATURES.md` updated to
      record these as deleted rather than orphaned; the browse-page
      `AIWatchTimeBanner.tsx` was out of scope (different directory) and is
      untouched.
- [x] `VideoInfo.tsx` rewritten — removed every non-backed interactive
      control: Like/Dislike (no increment endpoint exists for `likes_count`
      despite the column being real), Watchlist (no backend concept at all),
      Follow + a dicebear-avatar "creator" card (there's no channel/creator
      entity — `director` is a plain credit string, not a followable entity),
      Share and Download (both were inert buttons; the one real download
      endpoint is admin-only, not usable from a public watch page). Kept:
      title, eyebrow metadata row, synopsis (moved out of a boxed `bg-card`
      panel onto the plain page background — Netflix's own title screens
      don't box synopsis text), a plain "Directed by X" line (null-guarded —
      the old version crashed toward an empty avatar/name when `director` was
      null), Cast badges, Tags badges. Tags also lost a pre-existing wart:
      `cursor-pointer hover:bg-accent` with **no click handler** — a small
      mock-affordance in its own right, now static like Cast. Deliberately
      **not** animated internally — the page-level `useStaggeredReveal` in
      `page.tsx` already fades this whole column in as one of three blocks;
      a second nested stagger on VideoInfo's own children would compound
      opacity against the outer one and read as sluggish rather than
      cinematic (caught before writing the code, not after).
- [x] `VideoCard.tsx` — addressed the user's "barebones/bootstrapped" and
      "faded gradient" feedback on Step 8's card treatment: the bottom
      gradient scrim is now **always present** at low strength
      (`from-background/45`) instead of hover-only, so thumbnails read as
      color-graded key art at rest, not flat screenshots; deepens to `/80` on
      hover. Added a poster-edge ring (`ring-border/60`, brightens on hover)
      and a static center play-glyph that fades in on hover — a hint, not an
      autoplay preview, staying inside the already-decided "no Netflix
      mega-hover" boundary. Cyan budget stayed put: the title's accent
      underline remains the only cyan touch per card: the new ring and play
      icon are neutral (`ring-border`, `text-foreground`), not cyan, to avoid
      stacking three accent elements on one hovered card.
- [x] `RelatedVideos.tsx` rewritten to import `VideoCard`/`VideoCardSkeleton`
      directly instead of hand-rolling its own thumbnail markup and a second,
      slightly different skeleton — one card implementation, two call sites,
      not two components that drift apart over time.
- [x] `VideoPlayer.tsx` — dropped the hard `border border-border/60` around
      the player. `.media-default-skin` in `player.css` already supplies its
      own `border-radius` (2rem, via `--media-border-radius`), so removing
      the Tailwind border doesn't leave square corners — it just lets the
      ambient glow (§6) read as bleeding directly behind the player instead
      of stopping at a visible edge.
- [x] Fixed a real bug in `useScrollReveal` (caught by the advisor before
      implementation, not after): the hook's `useEffect` had a hardcoded `[]`
      dependency array, so on `VideoGrid.tsx` — where the skeleton grid and
      the loaded grid are two branches of one ternary at the same JSX
      position — the reveal only ever fired once, during the skeleton phase,
      and never again once real cards replaced them. Extended the hook with
      an optional `deps` array (defaults to `[]`, so both existing callers,
      `LandingCTA.tsx` and `LandingFeatures.tsx`, are unaffected — grep-
      confirmed neither is actually imported anywhere either, both orphaned
      leftovers of the retired marketing landing page) and an optional
      `{ stagger: true }` mode that animates the container's direct children
      instead of the container itself. `VideoGrid.tsx` now passes
      `[isPending, videos?.length]` as deps and `{ stagger: true }`, and only
      attaches the ref to the loaded-state grid div (not the skeleton one) —
      the ref transitions from unset to set exactly when real data lands,
      which is what re-triggers the effect correctly regardless of whether
      React reuses the underlying DOM node across the ternary branches.
      Also promoted the section header from a tiny all-caps `.eyebrow` label
      to a proper `text-2xl` heading — an eyebrow is for quiet metadata, not
      a section's main title, and Netflix/Apple-TV-style section headers
      carry real visual weight.
- [x] `docs/DESIGN_SYSTEM.md` updated: §1 Influences (YouTube demoted to
      "superseded on the watch page," Netflix's minimal-info-stack influence
      made explicit), §4 Reference implementations (`VideoCard.tsx` entry
      notes it's now shared by two consumers, not duplicated), §5 Step 2 note
      pointing at this section.
- [x] `pnpm build` clean, raw-color grep clean across every file touched this
      pass. **Not verified this pass:** a live browser check — the
      Claude-in-Chrome extension was retried at both the start and end of
      this session and remained disconnected throughout, so verification
      is `pnpm build`/`tsc` plus a careful manual re-read, not an actual
      rendered screenshot, same caveat as Step 8.
- [ ] **Known gap surfaced, not fixed, during this pass:** `views_count` is
      displayed on both `VideoCard.tsx` and `VideoInfo.tsx`, but the frontend
      never calls the real, anonymous-friendly `POST /videos/{id}/view`
      endpoint — so the number shown is permanently whatever it was at
      creation (usually 0). Flagged rather than silently wired up (scope
      creep) or silently left as-is (this pass was specifically about
      removing things that don't do what they appear to do).

## Deferred (tracked, not part of this task)

- [ ] **§7 route restructure** (public browse/watch route groups, auth-guard
      changes, backend `GET /videos/by-id/{id}` optional-auth change) —
      separate task; touches the backend.
