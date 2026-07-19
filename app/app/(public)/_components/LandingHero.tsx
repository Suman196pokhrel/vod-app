"use client";

import Link from "next/link";
import { LandingHeroBackdrop } from "./LandingHeroBackdrop";
import { LandingHeroDevice } from "./LandingHeroDevice";
import { useHeroIntro } from "@/lib/motion/useHeroIntro";

export function LandingHero() {
  const { eyebrowRef, headlineRef, subcopyRef, ctaRef, deviceRef, backdropRef } =
    useHeroIntro();

  return (
    <section className="relative flex min-h-[85vh] items-center overflow-hidden">
      <LandingHeroBackdrop ref={backdropRef} />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <span ref={eyebrowRef} className="eyebrow mb-6 block">
            Now streaming
          </span>

          <h1
            ref={headlineRef}
            style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)" }}
            className="leading-[0.95] tracking-[-0.03em] text-foreground"
          >
            Your next watch
            <br />
            is already here.
          </h1>

          <p
            ref={subcopyRef}
            className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            One feed, no clutter, no noise. Adaptive streaming that just
            works, on every screen.
          </p>

          <div ref={ctaRef} className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/auth/sign-up"
              className="rounded-md bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-opacity duration-(--duration-base) hover:opacity-90"
            >
              Start watching
            </Link>
            <Link
              href="/auth/sign-in"
              className="rounded-md border border-border px-7 py-3 text-sm font-medium text-foreground transition-colors duration-(--duration-fast) hover:border-foreground"
            >
              Sign in
            </Link>
          </div>
        </div>

        <LandingHeroDevice ref={deviceRef} />
      </div>
    </section>
  );
}
