"use client";

import Link from "next/link";
import { useScrollReveal } from "@/lib/motion/useScrollReveal";

export function LandingCTA() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="border-t border-border py-20">
      <div
        ref={ref}
        className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <h2 className="max-w-md text-3xl tracking-tight text-foreground sm:text-4xl">
          Ready to watch differently?
        </h2>
        <Link
          href="/auth/sign-up"
          className="shrink-0 rounded-md bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity duration-(--duration-base) hover:opacity-90"
        >
          Create a free account
        </Link>
      </div>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} VOD. All rights reserved.</span>
        <span>Fast. Minimal. Built for streaming.</span>
      </footer>
    </section>
  );
}
