import React from "react";

const STATS = [
  { value: "100%", label: "Open source", sub: "MIT licensed, fork-friendly" },
  { value: "2", label: "Core languages", sub: "Python backend · TypeScript UI" },
  { value: "5+", label: "AI features planned", sub: "FPS · captions · scene nav · ads · i18n" },
  { value: "∞", label: "Extensible", sub: "Self-host, swap, or extend anything" },
];

export function LandingStats() {
  return (
    <section className="mt-16">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-r from-indigo-50/60 via-white to-violet-50/60 p-6 shadow-[0_4px_24px_rgba(15,23,42,0.05)] sm:p-8">
        {/* Subtle corner decoration */}
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-indigo-200/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-violet-200/20 blur-2xl" />

        <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-col gap-1 ${
                i < STATS.length - 1
                  ? "border-b border-slate-200 pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6"
                  : ""
              }`}
            >
              <span className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                <span className="bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  {stat.value}
                </span>
              </span>
              <span className="text-sm font-semibold text-slate-800">{stat.label}</span>
              <span className="text-xs text-slate-500">{stat.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
