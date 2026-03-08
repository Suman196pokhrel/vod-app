import React from "react";
import Link from "next/link";
import { VibeLogo } from "@/components/logos/VibeLogo";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, #e2e8f0 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
          opacity: 0.5,
        }}
      />
      {/* White radial fade — keeps center clean */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 75% at 50% 40%, rgba(255,255,255,0.97) 15%, transparent 80%)",
        }}
      />

      {/* Violet orb — top left */}
      <div
        className="animate-float-slow pointer-events-none absolute rounded-full blur-3xl"
        style={{
          width: "520px",
          height: "520px",
          top: "-22%",
          left: "-16%",
          background: "radial-gradient(circle, rgba(167,139,250,0.20) 0%, transparent 60%)",
        }}
      />
      {/* Sky orb — bottom right */}
      <div
        className="animate-float-medium pointer-events-none absolute rounded-full blur-3xl"
        style={{
          width: "440px",
          height: "440px",
          bottom: "-18%",
          right: "-14%",
          background: "radial-gradient(circle, rgba(56,189,248,0.16) 0%, transparent 60%)",
          animationDelay: "2s",
        }}
      />
      {/* Indigo orb — center-left */}
      <div
        className="animate-float-fast pointer-events-none absolute rounded-full blur-3xl"
        style={{
          width: "300px",
          height: "300px",
          top: "50%",
          left: "-8%",
          background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 60%)",
          animationDelay: "1s",
        }}
      />

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-indigo-300/50 to-transparent" />

      {/* Header */}
      <header className="relative flex items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="inline-flex items-center gap-2">
          <VibeLogo size="md" animated />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:border-indigo-200 hover:text-indigo-700"
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

      {/* Main centered content */}
      <main className="relative flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  );
}
