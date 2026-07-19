# Design System Migration — Progress Tracker

Source of truth: [`docs/DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md). Reconciliation
decisions and scope: [`docs/superpowers/specs/2026-07-19-frontend-design-system-migration-design.md`](./superpowers/specs/2026-07-19-frontend-design-system-migration-design.md).

All file paths below are relative to the `app/` package (Next.js App Router root
is `app/app/` on disk — there's a nested `app/` directory — but paths are
written the way the rest of the docs reference them, e.g. `app/(protected)/...`).

Run the doc's §8 verification checklist against each step before checking it done.

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
      is explicitly allowed), `RelatedVideos`/`CommentSection` still run on
      mock data so no real empty state applies yet.
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

## Deferred (tracked, not part of this task)

- [ ] **Admin dashboard full restyle** (analytics/users/categories/settings
      widgets, tables, charts) — inherits tokens automatically from Step 0
      (all confirmed to use semantic classes already, e.g. `bg-background`,
      `border-b`), but no hand-restyling this pass.
- [ ] **§7 route restructure** (public browse/watch route groups, auth-guard
      changes, backend `GET /videos/by-id/{id}` optional-auth change) —
      separate task; touches the backend.
