"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

const AI_FEATURES = [
  "AI-powered FPS boosting",
  "Automatic scene recognition",
  "Smart caption generation",
  "Intelligent ad placement",
  "Multi-language support",
  "Semantic video search",
];

// Each chip has its own polarity (attract toward cursor / repel away from cursor),
// max displacement, and falloff radius. Since each chip sits at a different
// screen position, the force vector is unique per chip — they all move independently.
const CHIPS = [
  {
    label: "FPS Boost Active",
    dotColor: "bg-emerald-500",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
    posClass: "-top-4 right-14 sm:right-20",
    polarity: "repel" as const,   // flees from cursor
    maxForce: 24,
    falloff: 260,
    floatDur: "4s",
    floatDel: "0s",
    hideMobile: false,
  },
  {
    label: "Live Captions",
    dotColor: "bg-sky-500",
    textColor: "text-sky-700",
    borderColor: "border-sky-200",
    posClass: "top-[8%] -left-5",
    polarity: "attract" as const,  // pulled toward cursor
    maxForce: 18,
    falloff: 210,
    floatDur: "5.5s",
    floatDel: "1.2s",
    hideMobile: true,
  },
  {
    label: "Smart Ad: 11:45",
    dotColor: "bg-amber-500",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
    posClass: "top-[50%] -right-5",
    polarity: "attract" as const,
    maxForce: 20,
    falloff: 230,
    floatDur: "3.8s",
    floatDel: "0.6s",
    hideMobile: true,
  },
  {
    label: "Scene detected",
    dotColor: "bg-violet-500",
    textColor: "text-violet-700",
    borderColor: "border-violet-200",
    posClass: "-bottom-4 right-20",
    polarity: "repel" as const,
    maxForce: 22,
    falloff: 250,
    floatDur: "4.5s",
    floatDel: "0.3s",
    hideMobile: false,
  },
  {
    label: "Multi-language",
    dotColor: "bg-blue-500",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
    posClass: "bottom-[22%] -left-5",
    polarity: "attract" as const,
    maxForce: 14,
    falloff: 190,
    floatDur: "6s",
    floatDel: "1.5s",
    hideMobile: true,
  },
  {
    label: "AI Transcript",
    dotColor: "bg-indigo-500",
    textColor: "text-indigo-700",
    borderColor: "border-indigo-200",
    posClass: "top-[30%] -left-5",
    polarity: "repel" as const,
    maxForce: 16,
    falloff: 200,
    floatDur: "5s",
    floatDel: "0.9s",
    hideMobile: true,
  },
];

export function LandingHero() {
  const [featureIdx, setFeatureIdx] = useState(0);
  const [featureVisible, setFeatureVisible] = useState(true);
  // outer = the CSS-floating wrapper (used to read each chip's own screen position)
  // inner = the child that receives the JS translate (no conflict with CSS animation)
  const chipOuterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chipInnerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Cycle through AI features with fade transition
  useEffect(() => {
    let innerTimeout: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setFeatureVisible(false);
      innerTimeout = setTimeout(() => {
        setFeatureIdx((i) => (i + 1) % AI_FEATURES.length);
        setFeatureVisible(true);
      }, 350);
    }, 2800);
    return () => {
      clearInterval(interval);
      clearTimeout(innerTimeout);
    };
  }, []);

  // Per-chip attract/repel physics: each chip computes its own force vector
  // based on its own screen position relative to the mouse — fully independent.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      chipOuterRefs.current.forEach((outerEl, i) => {
        const innerEl = chipInnerRefs.current[i];
        if (!outerEl || !innerEl) return;

        const rect = outerEl.getBoundingClientRect();
        const chipCx = rect.left + rect.width / 2;
        const chipCy = rect.top + rect.height / 2;

        // Vector from chip center to mouse
        const vx = e.clientX - chipCx;
        const vy = e.clientY - chipCy;
        const dist = Math.sqrt(vx * vx + vy * vy);

        const { polarity, maxForce, falloff } = CHIPS[i];
        // Exponential falloff: strong when close, fades naturally with distance
        const force = maxForce * Math.exp(-dist / falloff);
        const sign = polarity === "attract" ? 1 : -1;
        // Unit vector scaled by force and polarity
        const tx = sign * (vx / (dist + 0.001)) * force;
        const ty = sign * (vy / (dist + 0.001)) * force;

        innerEl.style.transform = `translate(${tx}px, ${ty}px)`;
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section className="relative grid gap-14 py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16 lg:py-28">
      {/* ── Left column: editorial copy ── */}
      <div className="flex flex-col justify-center space-y-8">
        {/* Live badge */}
        <div className="inline-flex w-fit items-center gap-2.5 rounded-full border border-slate-200 bg-white/90 px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping-soft absolute h-full w-full rounded-full bg-emerald-400 opacity-80" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Open-source &middot; Building in public
        </div>

        {/* Editorial headline — tight, bold, two stacked lines */}
        <h1 className="text-[3rem] font-black leading-[0.88] tracking-tight sm:text-[4rem] lg:text-[4.5rem]">
          <span className="block text-slate-900">Open-source</span>
          <span className="block text-slate-900">VOD platform.</span>
          <span className="block animate-gradient-shift bg-linear-to-r from-violet-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
            AI&#8209;native.
          </span>
        </h1>

        {/* Short subtitle — one crisp line */}
        <p className="max-w-[400px] text-base leading-relaxed text-slate-500">
          Full-stack streaming with Python&nbsp;+&nbsp;FastAPI today. AI-driven
          video intelligence tomorrow. Yours to own.
        </p>

        {/* Cycling AI roadmap feature */}
        <div className="flex items-center gap-3">
          <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-indigo-500">
            AI Roadmap
          </span>
          <span
            className="text-sm font-medium text-slate-800"
            style={{
              opacity: featureVisible ? 1 : 0,
              transform: featureVisible ? "translateY(0)" : "translateY(5px)",
              transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
          >
            → {AI_FEATURES[featureIdx]}
          </span>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-violet-600 to-indigo-600 px-7 py-3 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(99,75,229,0.38)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_12px_38px_rgba(99,75,229,0.52)]"
          >
            Get started free
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2.5 7h9M7.5 3l4 4-4 4"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-7 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-800"
          >
            Sign in
          </Link>
        </div>

        {/* Stack line — monospace, minimal */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-mono text-slate-400">
          {["Python", "FastAPI", "Next.js 15", "PostgreSQL", "Redis", "Celery"].map(
            (tech) => (
              <span key={tech} className="flex items-center gap-1.5">
                <span className="h-px w-3 bg-slate-200" />
                {tech}
              </span>
            )
          )}
        </div>
      </div>

      {/* ── Right column: mock video player + parallax chips ── */}
      <div className="relative flex items-center justify-center py-8 pl-8 pr-8">
        {/* Glow halo */}
        <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-linear-to-tr from-violet-300/25 via-indigo-200/15 to-sky-200/15 blur-2xl" />

        {/* Floating chips:
              outer div  → CSS float-slow animation (translateY only)
              inner div  → JS attract/repel transform (no conflict)             */}
        {CHIPS.map((chip, i) => (
          <div
            key={chip.label}
            ref={(el) => { chipOuterRefs.current[i] = el; }}
            className={`absolute z-10 ${chip.posClass} ${chip.hideMobile ? "hidden sm:flex" : "flex"}`}
            style={{
              animation: `float-slow ${chip.floatDur} ease-in-out ${chip.floatDel} infinite`,
              willChange: "transform",
            }}
          >
            <div
              ref={(el) => { chipInnerRefs.current[i] = el; }}
              style={{ transition: "transform 0.45s cubic-bezier(0.23, 1, 0.32, 1)" }}
              className={`flex items-center gap-1.5 rounded-full border ${chip.borderColor} bg-white px-3 py-1.5 text-[11px] font-semibold ${chip.textColor} shadow-lg`}
            >
              <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${chip.dotColor}`} />
              {chip.label}
            </div>
          </div>
        ))}

        {/* Main dashboard card */}
        <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.11)]">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="mx-2 flex h-5 flex-1 items-center justify-center rounded-md bg-slate-200/70 text-[10px] text-slate-400">
              vibelive.io/watch/getting-started
            </div>
            <div className="h-4 w-8 rounded bg-slate-200/70" />
          </div>

          {/* Video area */}
          <div className="relative bg-linear-to-br from-slate-900 via-indigo-950 to-violet-950">
            <div className="aspect-video w-full" />
            <div className="absolute inset-0 flex flex-col">
              <div className="relative flex-1 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)]" />

                {/* Center play controls */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="white" aria-hidden="true">
                        <polygon points="5,2.5 15.5,9 5,15.5" />
                      </svg>
                    </div>
                    {/* Animated waveform bars */}
                    <div className="flex items-end gap-[3px]">
                      {[
                        { h: 10, dur: "1.3s", del: "0s" },
                        { h: 18, dur: "1.1s", del: "0.15s" },
                        { h: 24, dur: "1.5s", del: "0.3s" },
                        { h: 16, dur: "1.2s", del: "0.1s" },
                        { h: 22, dur: "1.4s", del: "0.25s" },
                        { h: 12, dur: "1.0s", del: "0.05s" },
                        { h: 20, dur: "1.35s", del: "0.2s" },
                      ].map((bar, i) => (
                        <div
                          key={i}
                          className="w-1 origin-bottom rounded-full bg-white/55"
                          style={{
                            height: `${bar.h}px`,
                            animation: `waveform-bar ${bar.dur} ease-in-out ${bar.del} infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI overlay badges */}
                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-black/45 px-2.5 py-1 text-[9px] font-semibold text-white backdrop-blur-sm">
                    🎬 Scene: Backend Demo
                  </span>
                  <span className="rounded-full bg-indigo-600/70 px-2.5 py-1 text-[9px] font-semibold text-white backdrop-blur-sm">
                    AI ✦
                  </span>
                </div>

                {/* Caption bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/55 px-4 py-2 text-center backdrop-blur-sm">
                  <p className="text-[9px] leading-relaxed text-white/90">
                    &ldquo;&hellip;and that&apos;s how the FastAPI backend handles video transcoding at scale&hellip;&rdquo;
                  </p>
                </div>
              </div>

              {/* Player controls */}
              <div className="space-y-2 bg-slate-900/95 px-4 py-2.5">
                <div className="flex items-center gap-2.5 text-[9px] text-slate-400">
                  <span className="tabular-nums">7:23</span>
                  <div className="relative flex-1 h-1 rounded-full bg-slate-700">
                    <div className="absolute left-0 top-0 h-full w-[38%] rounded-full bg-linear-to-r from-indigo-500 to-violet-500">
                      <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-md" />
                    </div>
                  </div>
                  <span className="tabular-nums">24:15</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="#94a3b8" aria-hidden="true">
                      <polygon points="1.5,1 9.5,5.5 1.5,10" />
                    </svg>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="#94a3b8" aria-hidden="true">
                      <rect x="0.5" y="0.5" width="3.5" height="9" rx="1" />
                      <rect x="6" y="0.5" width="3.5" height="9" rx="1" />
                    </svg>
                    <div className="h-1 w-10 overflow-hidden rounded-full bg-slate-600">
                      <div className="h-full w-[65%] rounded-full bg-slate-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[8px] font-semibold">
                    <span className="rounded bg-sky-500/25 px-1.5 py-0.5 text-sky-400">CC</span>
                    <span className="rounded bg-violet-500/25 px-1.5 py-0.5 text-violet-400">AI</span>
                    <span className="rounded bg-slate-600/80 px-1.5 py-0.5 text-slate-300">1080p</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Below-player panels */}
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <div className="space-y-2 p-3.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">Chapters</p>
              {[
                { time: "0:00", label: "Intro", active: false },
                { time: "4:23", label: "Backend Setup", active: true },
                { time: "8:10", label: "AI Integration", active: false },
                { time: "14:00", label: "Live Demo", active: false },
              ].map((ch) => (
                <div
                  key={ch.label}
                  className={`flex items-center gap-2 rounded-md px-2 py-1 text-[10px] ${
                    ch.active ? "bg-indigo-50 text-indigo-700" : "text-slate-500"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      ch.active ? "animate-pulse bg-indigo-500" : "bg-slate-300"
                    }`}
                  />
                  <span className="tabular-nums text-slate-400">{ch.time}</span>
                  <span className="font-medium">{ch.label}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 p-3.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">AI Insights</p>
              {[
                { icon: "📊", label: "Scene", value: "Backend demo", color: "bg-indigo-50 text-indigo-700" },
                { icon: "📝", label: "Transcript", value: "Ready", color: "bg-emerald-50 text-emerald-700" },
                { icon: "🎯", label: "Smart ad", value: "11:45", color: "bg-violet-50 text-violet-700" },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-md px-2 py-1 text-[10px] ${item.color}`}
                >
                  <span className="text-[11px]">{item.icon}</span>
                  <span className="font-semibold">{item.label}</span>
                  <span className="ml-auto opacity-70">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
