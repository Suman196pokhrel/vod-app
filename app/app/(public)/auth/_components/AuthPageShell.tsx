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
