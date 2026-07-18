# Landing Page & Design System Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public landing page and give the auth pages a chrome-only restyle, replacing the current gradient/pastel "AI-generic" look with a monochrome, dark-only, cinematic aesthetic — without touching auth/routing logic.

**Architecture:** New landing-scoped design tokens (`--landing-*`) are added additively to `app/globals.css` without touching the existing shadcn `:root`/`.dark` tokens, so `home/` and `admin/` are unaffected. Landing components are hand-styled with Tailwind utilities against those tokens. Two small GSAP hooks (`useHeroIntro`, `useScrollReveal`) drive all motion, scoped to landing/auth components only.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, gsap (new dependency).

## Global Constraints

- No file exceeds ~300 lines. Split into smaller components where needed.
- No gradients, box-shadows, blur, or glassmorphism anywhere in new/restyled code.
- No accent color — pure monochrome (`--landing-bg` #0a0a0a, `--landing-fg` #fafafa, `--landing-muted` #737373, `--landing-border` #262626, `--landing-elevated` #141414). The existing Tailwind `red-*` palette may be used for genuine error states only, never decoratively.
- Do not modify the existing `:root`/`.dark` tokens in `app/globals.css` — new `--landing-*` tokens are additive only.
- No new font — keep Geist Sans/Mono (`--font-geist-sans`/`--font-geist-mono`), already loaded in `app/layout.tsx`.
- GSAP + ScrollTrigger usage must live only inside landing/auth-specific files (`lib/motion/*`, `app/(public)/**`), never imported from `home/` or `admin/`. All motion must no-op when `window.matchMedia("(prefers-reduced-motion: reduce)").matches` is true.
- No changes to auth/routing logic: state variables, `handleSubmit`, validation functions, API calls (`useAuthStore`), and redirects in `components/signin-form.tsx` / `components/signup-form.tsx` must remain byte-for-byte identical — only `className` strings and SVG fill colors change.
- `VibeLogo`'s existing gradient behavior must remain the default (`mono` prop defaults to `false`) so `app/(protected)/home/_components/HomeNavbar.tsx` (out of scope) renders unchanged.
- Commits: no `Co-Authored-By` trailer — attribute to the user's own git identity only. One commit per task.
- Package manager is `pnpm` (confirmed via `pnpm-lock.yaml`). Frontend root is `app/` — run all commands from there.

---

### Task 1: Landing design tokens + noise utility

**Files:**
- Modify: `app/app/globals.css`

**Interfaces:**
- Produces: Tailwind utility classes `bg-landing-bg`, `text-landing-fg`, `text-landing-muted`, `border-landing-border`, `bg-landing-elevated`, and a `.bg-noise` CSS class — consumed by every task below.

- [ ] **Step 1: Add the landing color tokens to `@theme inline`**

In `app/app/globals.css`, inside the existing `@theme inline { ... }` block, immediately after the `--color-card: var(--card);` line, add:

```css
  --color-landing-bg: var(--landing-bg);
  --color-landing-fg: var(--landing-fg);
  --color-landing-muted: var(--landing-muted);
  --color-landing-border: var(--landing-border);
  --color-landing-elevated: var(--landing-elevated);
```

- [ ] **Step 2: Define the concrete token values**

In the same file, inside the `:root { ... }` block, immediately after `--radius: 0.625rem;`, add:

```css
  /* Landing/auth marketing surfaces are fixed dark-only — these tokens are
     intentionally NOT mirrored in .dark and never override the app's
     existing light/dark tokens above. */
  --landing-bg: #0a0a0a;
  --landing-fg: #fafafa;
  --landing-muted: #737373;
  --landing-border: #262626;
  --landing-elevated: #141414;
```

- [ ] **Step 3: Add the noise texture utility**

In the same file, inside the existing `@layer utilities { ... }` block, add at the end (after `.animate-ping-soft`):

```css
  /* Static grain texture (SVG feTurbulence, no image asset). Opacity is set
     by the consumer via a separate Tailwind opacity class. */
  .bg-noise {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-repeat: repeat;
  }
```

- [ ] **Step 4: Verify the build picks up the new tokens**

Run (from `app/`): `pnpm build`
Expected: Build succeeds with no CSS/type errors. (No visual change yet — tokens are unused until later tasks.)

- [ ] **Step 5: Commit**

```bash
cd /home/suman/DevStuff/projects/vod-app
git add app/app/globals.css
git commit -m "feat: add landing-scoped monochrome design tokens"
```

---

### Task 2: GSAP motion hooks

**Files:**
- Create: `app/lib/motion/useScrollReveal.ts`
- Create: `app/lib/motion/useHeroIntro.ts`
- Modify: `app/package.json` (add `gsap` dependency)

**Interfaces:**
- Produces: `useScrollReveal<T extends HTMLElement>(): React.RefObject<T | null>` — attach to any element for a fade-up scroll reveal.
- Produces: `useHeroIntro(): { eyebrowRef, headlineRef, subcopyRef, ctaRef, backdropRef }` — each a `RefObject` for the corresponding hero element.
- Consumed by: Task 4 (`LandingHero`, `LandingHeroBackdrop`), Task 6 (`LandingFeatures`), Task 7 (`LandingCTA`).

- [ ] **Step 1: Add the gsap dependency**

Run (from `app/`): `pnpm add gsap`
Expected: `gsap` added to `app/package.json` dependencies and `pnpm-lock.yaml` updated.

- [ ] **Step 2: Create the scroll-reveal hook**

Create `app/lib/motion/useScrollReveal.ts`:

```ts
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let pluginRegistered = false;

/**
 * Fades an element up into view the first time it scrolls within 85% of the
 * viewport. Fully skipped for prefers-reduced-motion users (element is just
 * visible immediately, no animation).
 */
export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    const tween = gsap.from(el, {
      opacity: 0,
      y: 16,
      duration: 0.4,
      ease: "power1.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        toggleActions: "play none none reverse",
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return ref;
}
```

- [ ] **Step 3: Create the hero intro hook**

Create `app/lib/motion/useHeroIntro.ts`:

```ts
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let pluginRegistered = false;

/**
 * Sequenced load-in for the hero (eyebrow -> headline -> subcopy -> cta),
 * plus a subtle scroll-linked parallax on the backdrop's highlight layer.
 * Both are skipped entirely for prefers-reduced-motion users.
 */
export function useHeroIntro() {
  const eyebrowRef = useRef<HTMLSpanElement | null>(null);
  const headlineRef = useRef<HTMLHeadingElement | null>(null);
  const subcopyRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    const elements = [
      eyebrowRef.current,
      headlineRef.current,
      subcopyRef.current,
      ctaRef.current,
    ];
    if (elements.every(Boolean)) {
      gsap.from(elements, {
        opacity: 0,
        y: 18,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.1,
      });
    }

    let scrollTween: gsap.core.Tween | undefined;
    if (backdropRef.current) {
      scrollTween = gsap.to(backdropRef.current, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: {
          trigger: backdropRef.current,
          scrub: 0.6,
        },
      });
    }

    return () => {
      scrollTween?.scrollTrigger?.kill();
      scrollTween?.kill();
    };
  }, []);

  return { eyebrowRef, headlineRef, subcopyRef, ctaRef, backdropRef };
}
```

- [ ] **Step 4: Type-check**

Run (from `app/`): `npx tsc --noEmit`
Expected: No errors (both hooks are unused by any component yet, which is fine — they're exported).

- [ ] **Step 5: Commit**

```bash
cd /home/suman/DevStuff/projects/vod-app
git add app/lib/motion/useScrollReveal.ts app/lib/motion/useHeroIntro.ts app/package.json app/pnpm-lock.yaml
git commit -m "feat: add gsap motion hooks for landing page"
```

---

### Task 3: VibeLogo mono variant

**Files:**
- Modify: `app/components/logos/VibeLogo.tsx` (full replace)

**Interfaces:**
- Produces: `VibeLogo` gains an optional `mono?: boolean` prop (default `false`). When `true`, renders solid `currentColor` fill instead of the purple/indigo/blue gradient. Default behavior (used by `HomeNavbar.tsx`, out of scope) is unchanged.
- Consumed by: Task 5 (`LandingNav`), Task 8 (`page.tsx`), Task 9 (`AuthPageShell`).

- [ ] **Step 1: Replace the file contents**

Replace all of `app/components/logos/VibeLogo.tsx` with:

```tsx
// VibeLogo.tsx - Modern Soundwave Logo

interface VibeLogoProps {
  variant?: "full" | "icon" | "text";
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  mono?: boolean;
  className?: string;
}

export function VibeLogo({
  variant = "full",
  size = "md",
  animated = false,
  mono = false,
  className = "",
}: VibeLogoProps) {
  const sizes = {
    sm: { height: 32, fontSize: "text-lg" },
    md: { height: 40, fontSize: "text-xl" },
    lg: { height: 56, fontSize: "text-3xl" },
    xl: { height: 72, fontSize: "text-4xl" },
  };

  const currentSize = sizes[size];
  // mono: solid currentColor fill for the new monochrome landing/auth
  // surfaces. Non-mono keeps the original gradient for surfaces (e.g. the
  // logged-in home nav) that are out of scope for this redesign.
  const barFill = mono ? "currentColor" : "url(#vibe-gradient)";
  const barFillFull = mono ? "currentColor" : "url(#vibe-gradient-full)";
  const textClass = mono
    ? "text-current"
    : "bg-linear-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent";

  // Icon Only - Soundwave bars
  if (variant === "icon") {
    return (
      <svg
        width={currentSize.height}
        height={currentSize.height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {!mono && (
          <defs>
            <linearGradient id="vibe-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: "#6366f1", stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
            </linearGradient>
          </defs>
        )}

        <rect x="15" y="35" width="10" height="30" rx="5" fill={barFill} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "0ms" } : {}} />
        <rect x="30" y="20" width="10" height="60" rx="5" fill={barFill} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "150ms" } : {}} />
        <rect x="45" y="10" width="10" height="80" rx="5" fill={barFill} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "300ms" } : {}} />
        <rect x="60" y="25" width="10" height="50" rx="5" fill={barFill} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "150ms" } : {}} />
        <rect x="75" y="40" width="10" height="20" rx="5" fill={barFill} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "0ms" } : {}} />
      </svg>
    );
  }

  // Text Only
  if (variant === "text") {
    return (
      <div className={`font-bold ${currentSize.fontSize} ${className}`}>
        <span className={textClass}>vibe</span>
      </div>
    );
  }

  // Full Logo (Icon + Text)
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <svg width={currentSize.height} height={50} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {!mono && (
          <defs>
            <linearGradient id="vibe-gradient-full" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: "#6366f1", stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
            </linearGradient>
          </defs>
        )}

        <rect x="15" y="35" width="10" height="30" rx="5" fill={barFillFull} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "0ms" } : {}} />
        <rect x="30" y="20" width="10" height="60" rx="5" fill={barFillFull} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "150ms" } : {}} />
        <rect x="45" y="10" width="10" height="80" rx="5" fill={barFillFull} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "300ms" } : {}} />
        <rect x="60" y="25" width="10" height="50" rx="5" fill={barFillFull} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "150ms" } : {}} />
        <rect x="75" y="40" width="10" height="20" rx="5" fill={barFillFull} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "0ms" } : {}} />
      </svg>

      <span className={`font-bold ${currentSize.fontSize} ${textClass}`}>VOD</span>
    </div>
  );
}
```

- [ ] **Step 2: Confirm the out-of-scope call site is unaffected**

Run: `grep -n "VibeLogo" "app/app/(protected)/home/_components/HomeNavbar.tsx"`
Expected: `<VibeLogo variant="full" size="xl" />` — no `mono` prop passed, so it still resolves `mono = false` and renders the original gradient exactly as before.

- [ ] **Step 3: Type-check**

Run (from `app/`): `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /home/suman/DevStuff/projects/vod-app
git add app/components/logos/VibeLogo.tsx
git commit -m "feat: add mono variant to VibeLogo"
```

---

### Task 4: Hero backdrop + hero section

**Files:**
- Create: `app/app/(public)/_components/LandingHeroBackdrop.tsx`
- Modify: `app/app/(public)/_components/LandingHero.tsx` (full replace)

**Interfaces:**
- Produces: `LandingHeroBackdrop` — `forwardRef<HTMLDivElement>` component, no props besides the ref.
- Produces: `LandingHero` — no props, default export is a named export `LandingHero`.
- Consumes: `useHeroIntro` from Task 2.
- Consumed by: Task 8 (`page.tsx`).

- [ ] **Step 1: Create the backdrop component**

Create `app/app/(public)/_components/LandingHeroBackdrop.tsx`:

```tsx
import { forwardRef } from "react";

// Static grain + a soft grayscale radial highlight for depth. This is a
// tonal vignette, not a color gradient — it stays within the "no gradients"
// rule because it never introduces hue, only light/dark falloff.
export const LandingHeroBackdrop = forwardRef<HTMLDivElement>(
  function LandingHeroBackdrop(_props, ref) {
    return (
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-landing-bg">
        <div
          ref={ref}
          className="absolute inset-0 opacity-[0.06]"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 20%, #ffffff, transparent 70%)",
          }}
        />
        <div className="bg-noise absolute inset-0 opacity-[0.035]" />
      </div>
    );
  }
);
```

- [ ] **Step 2: Replace the hero component**

Replace all of `app/app/(public)/_components/LandingHero.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { LandingHeroBackdrop } from "./LandingHeroBackdrop";
import { useHeroIntro } from "@/lib/motion/useHeroIntro";

export function LandingHero() {
  const { eyebrowRef, headlineRef, subcopyRef, ctaRef, backdropRef } = useHeroIntro();

  return (
    <section className="relative flex min-h-[85vh] items-center overflow-hidden">
      <LandingHeroBackdrop ref={backdropRef} />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <span
          ref={eyebrowRef}
          className="mb-6 block font-mono text-xs uppercase tracking-[0.25em] text-landing-muted"
        >
          Now streaming
        </span>

        <h1
          ref={headlineRef}
          style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}
          className="max-w-3xl font-extrabold leading-[0.95] tracking-[-0.03em] text-landing-fg"
        >
          Your next watch
          <br />
          is already here.
        </h1>

        <p
          ref={subcopyRef}
          className="mt-6 max-w-md text-base leading-relaxed text-landing-muted sm:text-lg"
        >
          One feed, no clutter, no noise. Adaptive streaming that just works,
          on every screen.
        </p>

        <div ref={ctaRef} className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/auth/sign-up"
            className="rounded-md bg-landing-fg px-7 py-3 text-sm font-semibold text-landing-bg transition-opacity hover:opacity-80"
          >
            Start watching
          </Link>
          <Link
            href="/auth/sign-in"
            className="rounded-md border border-landing-border px-7 py-3 text-sm font-medium text-landing-fg transition-colors hover:border-landing-fg"
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Type-check**

Run (from `app/`): `npx tsc --noEmit`
Expected: No errors. (`page.tsx` still imports the old sections at this point, so the app won't build end-to-end yet via `next build` — that's expected until Task 8. `tsc --noEmit` alone still validates these two files in isolation since TypeScript checks the whole project graph but these files don't yet break anything they're not wired into.)

- [ ] **Step 4: Commit**

```bash
cd /home/suman/DevStuff/projects/vod-app
git add "app/app/(public)/_components/LandingHeroBackdrop.tsx" "app/app/(public)/_components/LandingHero.tsx"
git commit -m "feat: rebuild landing hero with monochrome cinematic style"
```

---

### Task 5: Landing nav

**Files:**
- Create: `app/app/(public)/_components/LandingNav.tsx`

**Interfaces:**
- Produces: `LandingNav` — no props.
- Consumed by: Task 8 (`page.tsx`).

- [ ] **Step 1: Create the nav component**

Create `app/app/(public)/_components/LandingNav.tsx`:

```tsx
import Link from "next/link";
import { VibeLogo } from "@/components/logos/VibeLogo";

export function LandingNav() {
  return (
    <header className="border-b border-landing-border">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-landing-fg">
          <VibeLogo size="md" animated mono />
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/auth/sign-in"
            className="text-landing-muted transition-colors hover:text-landing-fg"
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className="rounded-md bg-landing-fg px-4 py-2 font-semibold text-landing-bg transition-opacity hover:opacity-80"
          >
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Type-check**

Run (from `app/`): `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /home/suman/DevStuff/projects/vod-app
git add "app/app/(public)/_components/LandingNav.tsx"
git commit -m "feat: add monochrome landing nav"
```

---

### Task 6: Feature strip (trimmed to 3 items)

**Files:**
- Modify: `app/app/(public)/_components/LandingFeatures.tsx` (full replace)

**Interfaces:**
- Produces: `LandingFeatures` — no props.
- Consumes: `useScrollReveal` from Task 2.
- Consumed by: Task 8 (`page.tsx`).

- [ ] **Step 1: Replace the features component**

Replace all of `app/app/(public)/_components/LandingFeatures.tsx` with:

```tsx
"use client";

import { useScrollReveal } from "@/lib/motion/useScrollReveal";

const FEATURES = [
  {
    number: "01",
    title: "Adaptive quality",
    description:
      "Six quality tiers, switched automatically to match your connection — no buffering, no manual toggling.",
  },
  {
    number: "02",
    title: "Every screen",
    description:
      "Phone, tablet, desktop, TV. The same fast, minimal player everywhere you watch.",
  },
  {
    number: "03",
    title: "Built for speed",
    description: "No clutter, no bloat. The feed loads fast and gets out of your way.",
  },
];

function FeatureBlock({ feature }: { feature: (typeof FEATURES)[number] }) {
  const ref = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="border-t border-landing-border pt-6">
      <span className="font-mono text-xs text-landing-muted">{feature.number}</span>
      <h3 className="mt-3 text-xl font-bold tracking-tight text-landing-fg">
        {feature.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-landing-muted">
        {feature.description}
      </p>
    </div>
  );
}

export function LandingFeatures() {
  return (
    <section className="py-20">
      <div className="grid gap-8 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <FeatureBlock key={feature.number} feature={feature} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run (from `app/`): `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /home/suman/DevStuff/projects/vod-app
git add "app/app/(public)/_components/LandingFeatures.tsx"
git commit -m "feat: trim landing features to a 3-item strip"
```

---

### Task 7: Closing CTA + footer

**Files:**
- Modify: `app/app/(public)/_components/LandingCTA.tsx` (full replace)

**Interfaces:**
- Produces: `LandingCTA` — no props. Includes the page footer.
- Consumes: `useScrollReveal` from Task 2.
- Consumed by: Task 8 (`page.tsx`).

- [ ] **Step 1: Replace the CTA component**

Replace all of `app/app/(public)/_components/LandingCTA.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { useScrollReveal } from "@/lib/motion/useScrollReveal";

export function LandingCTA() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="border-t border-landing-border py-20">
      <div
        ref={ref}
        className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <h2 className="max-w-md text-3xl font-extrabold tracking-tight text-landing-fg sm:text-4xl">
          Ready to watch differently?
        </h2>
        <Link
          href="/auth/sign-up"
          className="shrink-0 rounded-md bg-landing-fg px-8 py-3.5 text-sm font-semibold text-landing-bg transition-opacity hover:opacity-80"
        >
          Create a free account
        </Link>
      </div>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-2 border-t border-landing-border pt-6 text-xs text-landing-muted">
        <span>&copy; {new Date().getFullYear()} VOD. All rights reserved.</span>
        <span>Fast. Minimal. Built for streaming.</span>
      </footer>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run (from `app/`): `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /home/suman/DevStuff/projects/vod-app
git add "app/app/(public)/_components/LandingCTA.tsx"
git commit -m "feat: rebuild landing closing CTA and footer"
```

---

### Task 8: Compose the new landing page and delete the old sections

**Files:**
- Modify: `app/app/(public)/page.tsx` (full replace)
- Delete: `app/app/(public)/_components/LandingBackground.tsx`
- Delete: `app/app/(public)/_components/LandingStats.tsx`
- Delete: `app/app/(public)/_components/LandingProjectSection.tsx`
- Delete: `app/app/(public)/_components/LandingAiRoadmap.tsx`

**Interfaces:**
- Consumes: `LandingNav` (Task 5), `LandingHero` (Task 4), `LandingFeatures` (Task 6), `LandingCTA` (Task 7).

- [ ] **Step 1: Confirm no other file imports the components being deleted**

Run: `grep -rln "LandingBackground\|LandingStats\|LandingProjectSection\|LandingAiRoadmap" --include="*.tsx" app | grep -v node_modules`
Expected: Only `app/app/(public)/page.tsx` — confirming it's safe to delete these 4 files once `page.tsx` is rewritten.

- [ ] **Step 2: Delete the four unused section components**

```bash
cd /home/suman/DevStuff/projects/vod-app
rm "app/app/(public)/_components/LandingBackground.tsx"
rm "app/app/(public)/_components/LandingStats.tsx"
rm "app/app/(public)/_components/LandingProjectSection.tsx"
rm "app/app/(public)/_components/LandingAiRoadmap.tsx"
```

- [ ] **Step 3: Replace the page composition**

Replace all of `app/app/(public)/page.tsx` with:

```tsx
import { LandingNav } from "./_components/LandingNav";
import { LandingHero } from "./_components/LandingHero";
import { LandingFeatures } from "./_components/LandingFeatures";
import { LandingCTA } from "./_components/LandingCTA";

export default function Home() {
  return (
    <main className="min-h-screen bg-landing-bg text-landing-fg">
      <LandingNav />
      <LandingHero />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <LandingFeatures />
        <LandingCTA />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Build**

Run (from `app/`): `pnpm build`
Expected: Build succeeds with no errors (this is the first point the whole page compiles end-to-end since the old sections were removed).

- [ ] **Step 5: Visual verification**

Run (from `app/`): `pnpm dev`
Open `http://localhost:3000` in a browser and confirm:
- Page background is near-black, all text is white/gray — no gradients, no colored badges, no blur.
- Hero headline "Your next watch is already here." renders large, fades/slides in on load.
- Scrolling down reveals the 3 feature blocks and the closing CTA with a subtle fade-up.
- Nav shows the logo (solid white, no gradient), "Sign in" and "Sign up" links.
- No console errors.

Stop the dev server after verifying (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
cd /home/suman/DevStuff/projects/vod-app
git add "app/app/(public)/page.tsx"
git rm "app/app/(public)/_components/LandingBackground.tsx" "app/app/(public)/_components/LandingStats.tsx" "app/app/(public)/_components/LandingProjectSection.tsx" "app/app/(public)/_components/LandingAiRoadmap.tsx"
git commit -m "feat: compose the new monochrome landing page"
```

---

### Task 9: Auth page shell restyle

**Files:**
- Modify: `app/app/(public)/auth/_components/AuthPageShell.tsx` (full replace)

**Interfaces:**
- Consumes: `VibeLogo` with `mono` prop (Task 3).
- No signature change — still `AuthPageShell({ children }: { children: React.ReactNode })`, used unchanged by every auth route.

- [ ] **Step 1: Replace the shell component**

Replace all of `app/app/(public)/auth/_components/AuthPageShell.tsx` with:

```tsx
import React from "react";
import Link from "next/link";
import { VibeLogo } from "@/components/logos/VibeLogo";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-landing-bg text-landing-fg">
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.035]" />

      <header className="relative flex items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="text-landing-fg">
          <VibeLogo size="md" animated mono />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-md border border-landing-border px-3.5 py-1.5 text-xs font-medium text-landing-muted transition-colors hover:border-landing-fg hover:text-landing-fg"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M8 2L4 6l4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to home
        </Link>
      </header>

      <main className="relative flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run (from `app/`): `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /home/suman/DevStuff/projects/vod-app
git add "app/app/(public)/auth/_components/AuthPageShell.tsx"
git commit -m "feat: restyle auth page shell to monochrome"
```

---

### Task 10: Sign-in and sign-up card restyle

**Files:**
- Modify: `app/components/signin-form.tsx` (full replace)
- Modify: `app/components/signup-form.tsx` (full replace)

**Interfaces:**
- No signature change — `LoginForm({ className, ...props }: React.ComponentProps<"div">)` and `SignupForm()` keep identical exports, props, state shape, and handlers.

- [ ] **Step 1: Replace the sign-in form**

Replace all of `app/components/signin-form.tsx` with:

```tsx
"use client"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/lib/store"
import { useState } from "react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const login = useAuthStore((state) => state.signin)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      toast.success("Logged in successfully")
      router.push("/home")
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("w-full max-w-sm animate-fade-in-scale", className)} {...props}>
      <div className="rounded-md border border-landing-border bg-landing-elevated px-8 py-9">
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-landing-fg">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 10c-5.333 0-8 2-8 3v1h16v-1c0-1-2.667-3-8-3z" fill="#0a0a0a" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-landing-fg">Welcome back</h1>
          <p className="mt-1 text-sm text-landing-muted">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-landing-fg">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-md border-landing-border bg-landing-bg text-sm text-landing-fg shadow-none placeholder:text-landing-muted focus-visible:border-landing-fg focus-visible:ring-2 focus-visible:ring-landing-fg/20"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-landing-fg">
                Password
              </label>
              <Link
                href="/auth/forgot-pw"
                className="text-xs font-medium text-landing-muted underline decoration-landing-border underline-offset-4 hover:text-landing-fg hover:decoration-landing-fg"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-md border-landing-border bg-landing-bg text-sm text-landing-fg shadow-none placeholder:text-landing-muted focus-visible:border-landing-fg focus-visible:ring-2 focus-visible:ring-landing-fg/20"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-md border border-red-900/40 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-400">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-md bg-landing-fg px-4 py-2.5 text-sm font-semibold text-landing-bg transition-opacity duration-200 hover:opacity-80 disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-landing-muted">
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-landing-fg underline decoration-landing-border underline-offset-4 hover:decoration-landing-fg">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace the sign-up form**

Replace all of `app/components/signup-form.tsx` with:

```tsx
"use client"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/lib/store"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function SignupForm() {
  const router = useRouter()
  const signup = useAuthStore((state) => state.signup)

  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [errors, setErrors] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string): boolean => {
    return password.length >= 8
  }

  const validateForm = (): boolean => {
    const newErrors = { userName: '', email: '', password: '', confirmPassword: '' }
    let isValid = true

    if (!userName.trim()) {
      newErrors.userName = 'Username is required'
      isValid = false
    } else if (userName.trim().length < 3) {
      newErrors.userName = 'Username must be at least 3 characters'
      isValid = false
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required'
      isValid = false
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
      isValid = false
    }

    if (!password) {
      newErrors.password = 'Password is required'
      isValid = false
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 8 characters'
      isValid = false
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
      isValid = false
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({ userName: '', email: '', password: '', confirmPassword: '' })

    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setIsLoading(true)

    try {
      await signup(email, userName, password)
      toast.success('Account created! Please check your email to verify.')
      setTimeout(() => {
        router.push('/auth/sign-in')
      }, 2000)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-in-scale">
      <div className="rounded-md border border-landing-border bg-landing-elevated px-8 py-9">
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-landing-fg">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-6 15c0-3.314 2.686-5 6-5s6 1.686 6 5H4z" fill="#0a0a0a"/>
              <path d="M17 7v2m0 2v2" stroke="#0a0a0a" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M16 9h2" stroke="#0a0a0a" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-landing-fg">Create your account</h1>
          <p className="mt-1 text-sm text-landing-muted">Free forever. No credit card required.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-sm font-medium text-landing-fg">
              Username
            </label>
            <Input
              id="username"
              type="text"
              placeholder="johndoe"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-md border-landing-border bg-landing-bg text-sm text-landing-fg shadow-none placeholder:text-landing-muted focus-visible:border-landing-fg focus-visible:ring-2 focus-visible:ring-landing-fg/20"
            />
            {errors.userName && (
              <p className="text-xs text-red-400">{errors.userName}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-landing-fg">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-md border-landing-border bg-landing-bg text-sm text-landing-fg shadow-none placeholder:text-landing-muted focus-visible:border-landing-fg focus-visible:ring-2 focus-visible:ring-landing-fg/20"
            />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-landing-fg">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-md border-landing-border bg-landing-bg text-sm text-landing-fg shadow-none placeholder:text-landing-muted focus-visible:border-landing-fg focus-visible:ring-2 focus-visible:ring-landing-fg/20"
            />
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-landing-fg">
              Confirm password
            </label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-md border-landing-border bg-landing-bg text-sm text-landing-fg shadow-none placeholder:text-landing-muted focus-visible:border-landing-fg focus-visible:ring-2 focus-visible:ring-landing-fg/20"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-1 w-full rounded-md bg-landing-fg px-4 py-2.5 text-sm font-semibold text-landing-bg transition-opacity duration-200 hover:opacity-80 disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating account...
              </span>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-landing-muted">
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="font-semibold text-landing-fg underline decoration-landing-border underline-offset-4 hover:decoration-landing-fg">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Diff against the originals to confirm logic is untouched**

Run:
```bash
cd /home/suman/DevStuff/projects/vod-app
git diff app/components/signin-form.tsx | grep -E "^[+-]" | grep -viE "className|fill=|stroke=\"#0a0a0a\""
git diff app/components/signup-form.tsx | grep -E "^[+-]" | grep -viE "className|fill=|stroke=\"#0a0a0a\""
```
Expected: No output beyond the `+++`/`---` file headers and the two removed blank/whitespace-only lines near the end of each form's `<form>` block — every other changed line must be a `className` or SVG color attribute. If any state, handler, or validation line shows up, stop and fix before proceeding.

- [ ] **Step 4: Visual verification**

Run (from `app/`): `pnpm dev`
Open `http://localhost:3000/auth/sign-in` and `http://localhost:3000/auth/sign-up` and confirm:
- Dark shell, dark card, white/gray text, no gradients on the icon square or submit button.
- Typing in the fields, submitting with bad credentials, and the "Forgot password?" / "Create one free" / "Sign in" links all still work exactly as before (only their color changed).

Stop the dev server after verifying (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
cd /home/suman/DevStuff/projects/vod-app
git add app/components/signin-form.tsx app/components/signup-form.tsx
git commit -m "feat: restyle sign-in and sign-up cards to monochrome"
```

---

### Task 11: Final whole-app verification

**Files:** None (verification only).

- [ ] **Step 1: Full build**

Run (from `app/`): `pnpm build`
Expected: Succeeds with no errors or new warnings.

- [ ] **Step 2: Lint**

Run (from `app/`): `pnpm lint`
Expected: No new errors introduced by this plan's files (pre-existing unrelated warnings elsewhere in the repo are out of scope).

- [ ] **Step 3: Confirm out-of-scope surfaces are untouched**

Run: `git diff --stat main -- "app/app/(protected)"`
Expected: No output — nothing under `app/(protected)/` (home feed, admin) changed.

- [ ] **Step 4: Full manual pass**

Run (from `app/`): `pnpm dev`
Walk through: `/` (landing) → `/auth/sign-up` → `/auth/sign-in` → sign in with a real account → confirm `/home` (protected) still renders exactly as before (unchanged gradient logo, unchanged layout). Stop the dev server after verifying (Ctrl+C).

- [ ] **Step 5: Commit (only if Steps 1-4 required fixes)**

If any fixes were needed to pass build/lint/manual verification:
```bash
cd /home/suman/DevStuff/projects/vod-app
git add -A
git commit -m "fix: address build/lint issues from landing redesign"
```
If no fixes were needed, skip this step — there is nothing to commit.
