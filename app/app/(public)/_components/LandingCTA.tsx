import React from "react";
import Link from "next/link";

export function LandingCTA() {
  return (
    <section className="mt-20">
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-linear-to-br from-indigo-50 via-white to-violet-50 px-8 py-14 text-center shadow-[0_8px_48px_rgba(79,70,229,0.09)] sm:px-14">
        {/* Background decorations */}
        <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/40 blur-3xl" />

        {/* Pill */}
        <div className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm">
          <span className="flex h-2 w-2 shrink-0">
            <span className="animate-ping-soft absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-80" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Demo ready &mdash; explore freely, break things
        </div>

        {/* Headline */}
        <h2 className="relative mx-auto mb-4 max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Start building your VOD platform{" "}
          <span className="bg-linear-to-r from-violet-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
            today.
          </span>
        </h2>
        <p className="relative mx-auto mb-8 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
          Sign up, explore the dashboard, play with the FastAPI backend, and get a
          feel for what the platform can become. No credit card. No lock-in.
        </p>

        {/* CTAs */}
        <div className="relative flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-violet-600 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(99,75,229,0.38)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_12px_38px_rgba(99,75,229,0.52)]"
          >
            Create a free account
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2.5 7h9M7.5 3l4 4-4 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-800"
          >
            I already have an account
          </Link>
        </div>

        {/* Trust footer */}
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
          {[
            "No credit card required",
            "100% open source",
            "Self-hostable",
          ].map((label) => (
            <div key={label} className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 6.5l3 3 5-5" stroke="#a3e635" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
