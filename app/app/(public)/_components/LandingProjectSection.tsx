import React from "react";

const TECH_STACK = [
  { label: "Python 3.11+", color: "bg-sky-50 text-sky-700 ring-sky-200" },
  { label: "FastAPI", color: "bg-teal-50 text-teal-700 ring-teal-200" },
  { label: "Next.js 15", color: "bg-slate-100 text-slate-700 ring-slate-200" },
  { label: "PostgreSQL", color: "bg-blue-50 text-blue-700 ring-blue-200" },
  { label: "Redis", color: "bg-red-50 text-red-700 ring-red-200" },
  { label: "Celery", color: "bg-green-50 text-green-700 ring-green-200" },
  { label: "Docker", color: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  { label: "HLS / FFmpeg", color: "bg-orange-50 text-orange-700 ring-orange-200" },
];

const TODAY = [
  "Auth, roles and secure session handling",
  "Admin views for videos, users and categories",
  "Analytics to understand content performance",
  "A viewer home experience wired to real data",
  "Background job processing with Celery + Redis",
  "Containerised and ready to self-host",
];

const DEVELOPER = [
  "A Python stack you can extend without fighting it",
  "Clean FastAPI services with clear boundaries",
  "A dashboard wired for rapid experimentation",
  "Docker setup for local and production parity",
  "A codebase you fully own — no vendor lock-in",
];

export function LandingProjectSection() {
  return (
    <section className="mt-20 border-t border-slate-100 pt-16">
      <div className="mb-12 space-y-3 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">
          The project
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          A real foundation, not a toy starter.
        </h2>
        <p className="mx-auto max-w-xl text-sm text-slate-500 sm:text-base">
          This isn&apos;t a landing-page template. It&apos;s a production-minded, open-source
          VOD platform built end-to-end — with a clear stack, honest trade-offs,
          and room to grow in any direction.
        </p>
      </div>

      {/* Tech stack badges */}
      <div className="mb-12 flex flex-wrap justify-center gap-2">
        {TECH_STACK.map((tech) => (
          <span
            key={tech.label}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition-transform duration-200 hover:scale-105 ${tech.color}`}
          >
            {tech.label}
          </span>
        ))}
      </div>

      {/* Two-column detail grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today card */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_8px_36px_rgba(15,23,42,0.09)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-500">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Shipped</p>
              <p className="text-sm font-bold text-slate-900">What you get today</p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {TODAY.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                <svg
                  className="mt-0.5 shrink-0 text-emerald-500"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Developer card */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_8px_36px_rgba(15,23,42,0.09)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-500">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M5 3L2 8l3 5M11 3l3 5-3 5M9 2.5l-2 11" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Developer-first</p>
              <p className="text-sm font-bold text-slate-900">As a developer, you keep</p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {DEVELOPER.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                <svg
                  className="mt-0.5 shrink-0 text-indigo-400"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Why this exists callout */}
      <div className="mt-6 rounded-2xl border border-indigo-100 bg-linear-to-r from-indigo-50/70 to-violet-50/50 p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-indigo-600 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 2l1.7 5.2H16l-4.3 3.1 1.6 5L9 12.2l-4.3 3.1 1.6-5L2 7.2h5.3L9 2z" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-slate-900">Why this project exists</p>
            <p className="text-sm leading-relaxed text-slate-600">
              The goal is simple: give builders a serious, opinionated VOD starting point so
              that experimenting feels exciting instead of heavy. The stack is intentionally
              chosen but never locked-in — swap pieces, self-host, extend, or fork it in
              whichever direction makes sense for you. Under the hood, the project stays honest
              about what works today and where the real ambition sits: AI-powered video,
              built progressively, in the open.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
