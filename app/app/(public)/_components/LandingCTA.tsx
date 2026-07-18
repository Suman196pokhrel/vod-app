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
