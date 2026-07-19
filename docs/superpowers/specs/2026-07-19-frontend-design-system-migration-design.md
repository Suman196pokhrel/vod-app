# Frontend Design System Migration — Design

**Date:** 2026-07-19
**Status:** Approved for planning
**Source material:** `files.zip` (extracted, contained `DESIGN_SYSTEM.md`, `globals.css`,
`VideoPlayer.tsx`, `VideoCard.tsx`, `useAmbientColor.ts` — reference implementations
for a new dark, cyan-accented design system).

## 1. Goal

Roll out the new design system (`DESIGN_SYSTEM.md`, checked into this repo at
`docs/DESIGN_SYSTEM.md` as part of this work) across the Next.js frontend,
surface by surface, without discarding existing working functionality —
particularly the already-built HLS video player subsystem, which is more
complete than the zip's reference implementation.

`docs/DESIGN_SYSTEM.md` is the design authority (tokens, component rules,
copy rules, verification checklist). This document covers *how we get there
from the current codebase*: what conflicts with the current state, what's in
scope, and in what order.

## 2. Current-state findings that shape this plan

- **No light mode is actually wired up today.** `app/layout.tsx` never applies
  a `.dark` class and no `next-themes` provider exists (only `sonner.tsx`
  references theming). The `.dark { ... }` block in `app/globals.css` is dead
  code today. Protected-app surfaces (home, watch, admin) currently render
  against the default shadcn **light** `:root` tokens.
- **`--sidebar-*` tokens in `globals.css` are unused** — no component
  (including the hand-rolled `AdminSidebar.tsx`) references `bg-sidebar`,
  `text-sidebar-*`, etc. Safe to drop.
- **`--landing-*` tokens** are a bespoke, isolated dark token set added for
  the recent landing-page/auth monochrome redesign (see memory:
  `project_landing_redesign.md`). Not part of the new design system's token
  set. Per decision below, these are retired and landing/auth are migrated
  onto the unified tokens.
- **The video player is NOT a mock.** `app/(protected)/home/watch/[video_id]/_components/player/`
  contains a full custom implementation: `useHls.ts`, `useKeyboardShortcuts.ts`,
  `useFullscreen.ts`, `useTheaterMode.ts`, `ControlBar.tsx`, `VolumeControl.tsx`,
  `TheaterButton.tsx`, `ScrubBar.tsx`, `SettingsMenu.tsx`, etc. This is
  materially more capable than the zip's single-file reference `VideoPlayer.tsx`
  (which only demonstrates styling patterns: seek/progress in `--primary`,
  controls-reveal timing, quality menu via shadcn `DropdownMenu`+`Slider`).
  **Decision: restyle the existing subsystem in place; do not replace it with
  the reference file.** `CLAUDE.md`'s "Known Issues" list (player is a UI
  mock) and "VideoGrid renders 1 hardcoded video" are stale — both are
  confirmed real/API-wired by reading current code. `CLAUDE.md` should get a
  pass to correct this after the migration, since these known-issue notes
  will no longer be accurate.
- **Font variable names differ but don't need renaming.** Current:
  `--font-geist-sans` / `--font-geist-mono` (from `next/font/google` in
  `app/layout.tsx`). Zip's `globals.css` expects `--font-geist` /
  `--font-space-grotesk`. Resolution: keep current Geist variable names, add
  `Space_Grotesk` as `--font-space-grotesk`, and point `--font-display` /
  `--font-sans` at the correct existing variables in the `@theme inline` block.
  No component references font variables directly outside `layout.tsx` and
  `globals.css`, so this is a contained change.
- **Home page mock components match the doc's deletion list exactly.**
  `app/(protected)/home/page.tsx` renders `DevelopmentHero`,
  `AIWatchTimeBanner`, `MoodSelector`, `MoodSelectorCompact`,
  `ContinueWatching`, `Top10ThisWeek`, `ContentJourney` — all named in
  `DESIGN_SYSTEM.md` §3 rule 5. `PersonalizedRow` and `QuickAccessSidebar` are
  already commented out. Real components to keep and restyle: `HeroSection`,
  `CategoryPills`, `VideoGrid` (→ `VideoCard`).
- **Watch page has an equivalent, undocumented mock problem.** Five
  components — `AISceneTimeline`, `AIMoodAnalysis`, `AIRecommendations`,
  `AIWatchParty`, `AIContentWarnings` — are static/hardcoded per `CLAUDE.md`'s
  known issues, but aren't named in the design doc's deletion list (which only
  audited the home page). Real components to keep: `VideoPlayer`,
  `VideoInfo`, `VideoStats`, `CommentSection`, `RelatedVideos`.

## 3. Scope decisions

| Area | Decision |
|---|---|
| Admin dashboards (analytics/users/categories/settings) | Tokens land globally (auto-inherited), no hand-restyling this pass. Full restyle tracked as a deferred future task. |
| Upload/studio flow | In scope — restyled this pass (explicitly in doc §5.4). |
| Marketing landing page (hero/CTA/footer) | **Migrated** onto the new unified tokens; `--landing-*` retired. Not in the doc's §5 surface list, but included per explicit decision — this re-touches components shipped in the last few commits. |
| Auth screens | Migrated onto new tokens (doc §5.5) — single cyan primary CTA per screen. |
| Watch-page AI mock widgets | Deleted (same "real surfaces polished > fake surfaces themed" rule the doc applies to home, extended by decision to the watch page). |
| §7 route restructure (public browse/watch, backend auth change) | Deferred — separate task. Touches middleware and a backend endpoint; doc itself says keep it out of styling commits. |

## 4. Token architecture

**Merge, don't replace** `app/globals.css`. Verbatim-replacing with the zip's
file would silently drop `--landing-*` (fine, retired) and `--sidebar-*`
(fine, unused) but also anything added since the zip was authored, and offers
no diff trail. Concretely:

- `:root` becomes the zip's dark token set (surfaces, three-step text scale,
  cyan accent, functional colors, chart-1..5, radius, motion durations/easing,
  `--ambient`) — this becomes the *only* theme.
- Remove the `.dark { ... }` block (dead code, confirmed above).
- Remove `--sidebar-*` tokens (confirmed unused).
- Remove `--landing-*` tokens once landing/auth components no longer
  reference them (step 4, not step 0 — don't break landing before its
  replacement lands).
- Keep existing utility keyframes/classes not superseded by the new system
  (`animate-shimmer`, `bg-noise`, `bg-grid`, `animate-grid-sweep`,
  float/spin/gradient/slide/fade/ping keyframes) as long as a component still
  uses them after migration. Re-audit for dead code at the end of step 4.
- Add new utilities from the zip: `.eyebrow`, `.skeleton` (+ shimmer
  keyframes), `.surface-watch`, `.ambient-glow`, and the
  `prefers-reduced-motion` block (net-new, no current equivalent).
- `@theme inline` mapping: add `--color-surface-watch`, `--color-subtle`,
  update `--font-display`/`--font-sans` to point at the correct variable
  names, and remove the `--color-sidebar-*` entries alongside their tokens.
- Fonts: add `Space_Grotesk` via `next/font/google` in `app/layout.tsx`
  alongside the existing `Geist`/`Geist_Mono` calls, variable
  `--font-space-grotesk`.

## 5. Execution order

One surface per step/commit, mirroring `DESIGN_SYSTEM.md` §5:

0. **Tokens + fonts land globally** — `globals.css` merge, `layout.tsx` font
   wiring. Verify existing shadcn primitives (`components/ui/*`) pick up the
   new theme with no code changes (they're token-driven already).
1. **Watch page** — ambient glow (`useAmbientColor`, ported as-is per the
   doc's usage snippet), pure-black `--surface-watch`, eyebrow metadata row,
   restyle the existing player subsystem (not the reference file) to consume
   tokens, delete the 5 AI mock widgets, skeleton loading state.
2. **Browse/home grid** — delete the 8 home mock components (and their
   imports from `page.tsx`), restyle `VideoCard`/`VideoGrid`/`HeroSection`/
   `CategoryPills` to the reference `VideoCard.tsx` pattern (hover scale +
   accent underline, eyebrow metadata, card skeleton), MUBI-style spacing.
3. **Upload/studio flow** — themed form primitives in the admin video-upload
   form, upload progress in `--primary`, processing status as eyebrow text.
4. **Auth screens + landing page** — both migrated onto unified tokens;
   `--landing-*` retired from `globals.css` once no longer referenced;
   centered card auth layout, single cyan CTA per auth screen.
5. **Empty/error/loading audit** — sweep all touched surfaces for the three
   states per doc §2 Loading and §3.8 copy rules.
6. *(deferred, tracked only)* Admin dashboard full restyle.
7. *(deferred, tracked only)* §7 public-first route restructure.

Each of steps 0–5 gets the doc's §8 verification checklist run against it
before being marked done in the progress tracker.

## 6. Deliverables of this migration (non-code)

- `docs/DESIGN_SYSTEM.md` — the zip's design doc, checked in as the ongoing
  source of truth, added to `CLAUDE.md`'s documentation index.
- `docs/PROGRESS_DESIGN_MIGRATION.md` — living checklist tracking steps 0–7
  above (steps 6–7 listed as deferred/not started), updated after each step
  completes.

## 7. Explicitly out of scope

- Full admin dashboard restyle (analytics/users/categories/settings widgets,
  tables, charts) — tokens inherited automatically, hand-restyling deferred.
- §7 route restructure: moving `home/`/`home/watch/` out of the `(protected)`
  route group, auth-guard changes, and the backend change to
  `GET /videos/by-id/{id}` (optional auth). Backend work is out of scope for
  a frontend-focused task regardless.
- Any change to backend code, Celery pipeline, or infrastructure.
