# Landing Page & Design System Foundation Redesign

**Date:** 2026-07-19
**Status:** Approved

## Goal

Replace the public landing page's current "typical AI startup" look (pastel gradient badges, violet/indigo gradients, rainbow category rings, open-source-project framing) with a fast, minimal, monochrome, cinematic aesthetic targeting a Gen-Z streaming audience — without touching auth/routing logic. Establish reusable design-system primitives (colors, type scale, motion patterns) that a later phase can roll out to the home feed and admin panel.

## Scope

- **In scope:** `app/(public)/page.tsx` and its `_components/` (full rebuild), `AuthPageShell`/auth page chrome (restyle only — no field/logic changes), `VibeLogo` (restyle to solid color, drop gradient).
- **Out of scope this pass:** `app/(protected)/home/*`, `app/(protected)/admin/*`, any auth/routing/API logic, the global shadcn `:root`/`.dark` tokens in `app/globals.css` (left untouched so logged-in surfaces are unaffected).

## Visual Direction (validated via visual-companion brainstorming)

User was shown 4 style directions (dark neon/glow, minimal editorial dark, bold gradient mesh/glass, monochrome+accent) and picked **monochrome** decisively, then rejected all 3 accent-color options in favor of **pure mono, no accent**. Explicit constraint: "no typical AI-looking site — no emojis, no gradients, no blurs."

Cross-checked against the `ui-ux-pro-max` design database:
- Product type "Video Streaming/OTT" → Dark Mode + Hero-Centric + Motion-Driven (confirms dark-only + hero-centric direction; glassmorphism/vibrant secondary suggestions explicitly overridden per user's no-blur/no-gradient constraint).
- Style matches: *Minimalist Monochrome*, *Exaggerated Minimalism*, *Bold Typography (Mobile Poster)* — near-black/warm-white, 0–low radius, no shadows, oversized tight-tracked type, hierarchy from weight/size only.
- Typography match: *Modern Dark Cinema (Inter System)* — explicitly "Best For: streaming platforms" — single dominant sans family, hierarchy via weight (300–700) and negative tracking. Geist Sans/Mono is functionally equivalent to Inter here and already wired into the project (`next/font`, zero extra cost), so **no new font is introduced**.

## Design Tokens (landing-scoped only)

New CSS custom properties, added under a scope applied at the `(public)` layout root — **not** merged into the global `:root`/`.dark` tokens in `app/globals.css`:

```
--landing-bg:        #0A0A0A   /* near-black, not pure #000 */
--landing-fg:         #FAFAFA   /* warm white */
--landing-muted:      #737373   /* secondary text */
--landing-border:     #262626   /* hairline dividers, 1px only */
--landing-bg-elevated: #141414  /* subtle surface distinction, no shadow */
```

No accent color token. The existing shadcn `--destructive` red may be reused as-is for genuine error states only (e.g. a failed form submission on an auth page) — never as decoration.

Radius: small and consistent (~6px, e.g. Tailwind `rounded-md`) on buttons/interactive elements — deliberately not full 0px brutalist, to stay "modern product" rather than raw/unstyled. No box-shadows anywhere; depth comes from the 1px hairline border and type contrast only.

These tokens are documented here specifically so a future phase can promote them into the global theme without re-deriving the palette.

## Typography

- Geist Sans for all UI text; Geist Mono only for small uppercase "eyebrow" labels (e.g. "NOW STREAMING"), letter-spacing wide.
- Display/hero headline: `clamp(2.5rem, 6vw, 5.5rem)`, weight 800, tracking approx. `-0.03em`.
- Section headings: weight 700, tracking `-0.02em`.
- Body copy: weight 400–500, normal tracking, `text-neutral-400`-equivalent for secondary copy.
- Hierarchy is carried entirely by size/weight/spacing — this is the primary way "futuristic/bold" reads without any accent color.

## Landing Page Structure (trimmed from 6 sections to 4)

1. **Nav** — logo mark (see below) + Home / Sign in / Sign up. No extra chrome.
2. **Hero (full-bleed cinematic)** — eyebrow label, oversized headline, one line of subcopy, single primary CTA button. Background: solid near-black with a static, CSS-generated subtle grain/noise texture and a faint grayscale radial highlight (no real content images exist yet to use as a backdrop — confirmed via repo search, `public/` has no sample media). The radial highlight gets a gentle scroll-linked parallax (GSAP, small `yPercent` delta).
3. **Feature strip** — exactly 3 benefit blocks (down from the current sprawling features grid + separate stats + project-badges + AI-roadmap sections). Each block: a large number/label + one short line. Scroll-triggered stagger reveal.
4. **Closing CTA band + footer** — one final CTA repeated, minimal footer line.

**Dropped entirely:** "MIT licensed / self-host / fork-friendly" open-source project framing, the tech-stack badge row, the "AI roadmap" teaser cards. Copy is rewritten from a dev-project pitch to a consumer streaming pitch (matches the "Hero-Centric Design" landing pattern: full-bleed hero → value prop strip → benefit/proof → primary CTA).

## Logo

`VibeLogo`'s soundwave bars currently use a purple→indigo→blue linear gradient (`#8b5cf6 → #6366f1 → #3b82f6`), which directly conflicts with the no-gradient constraint. Restyle to solid `--landing-fg` (white) fill. Keep the existing `animated` prop/pulse behavior — that's motion, not color, so it stays.

## Motion

Add `gsap` + `gsap/ScrollTrigger` as a new dependency (user approved), imported only within landing `_components/` — no impact on other route bundles. No SplitText (paid plugin) — headline/subcopy/CTA get a simple sequential fade+`y` load-in instead of per-character animation.

Patterns (durations/easing pulled from the design database's Subtle/Standard tiers):
- Hero load-in: eyebrow → headline → subcopy → CTA, staggered fade+`y` (12–20px), `power2.out`, ~400–600ms total sequence.
- Section scroll reveals: fade+`y` (12–16px), `power1.out`, 300–400ms, triggered once per section (not per child element) to keep it restrained.
- Hero background radial-highlight: subtle scrub-linked parallax only, never applied to text.
- Everything wrapped in a `prefers-reduced-motion` check — reduced-motion users get instant states, no animation.

## Component Approach

Landing components are hand-styled with Tailwind utility classes against the new tokens above, rather than reusing the global shadcn `<Button>`/`<Card>` as-is (those are bound to the app-wide tokens this pass deliberately leaves untouched). Where a shadcn primitive's *behavior* is useful (e.g. `Separator`, `Tooltip` if needed), it can still be used with Tailwind class overrides for the landing palette.

## Auth Pages

Light pass only: restyle `AuthPageShell` and any pastel/gradient decoration in `FormFields`/`SuccessCard` to the same near-black/warm-white palette for visual consistency when a user clicks through from the new landing page. No changes to form fields, validation, or submit logic.

## Implementation Constraints (user-specified)

- No file exceeds ~300 lines — split into smaller components under `_components/` following the existing project pattern where needed.
- Modular structure; no monolithic single-file sections.
- Code should read clearly without needing comments for straightforward logic. Add a short comment above a block only where the logic itself is genuinely non-obvious (e.g. the GSAP `prefers-reduced-motion` guard, the parallax scroll-linked math).
- Commit after implementation; no `Co-Authored-By` trailer — commits attributed to the user's own git identity only.

## Out of Scope / Explicitly Deferred

- Home feed (`app/(protected)/home/`) and admin panel redesign — separate follow-up phase.
- Promoting these tokens into the global `:root`/`.dark` theme.
- Any change to auth/routing/API logic.
