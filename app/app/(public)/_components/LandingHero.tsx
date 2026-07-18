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
