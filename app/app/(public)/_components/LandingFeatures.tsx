"use client";

import React from "react";

// Defined outside component — no closure deps, no re-renders, direct DOM mutation
function onTiltMove(e: React.MouseEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  const rotX = (y - 0.5) * -16;
  const rotY = (x - 0.5) * 16;
  el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.03,1.03,1.03)`;
  el.style.transition = "none";
  const shine = el.querySelector<HTMLElement>("[data-shine]");
  if (shine) {
    shine.style.opacity = "1";
    shine.style.backgroundImage = `radial-gradient(220px circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.55), transparent 60%)`;
  }
}

function onTiltLeave(e: React.MouseEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  el.style.transform = "";
  el.style.transition = "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)";
  const shine = el.querySelector<HTMLElement>("[data-shine]");
  if (shine) {
    shine.style.opacity = "0";
    shine.style.transition = "opacity 0.4s ease";
  }
}

const FEATURES = [
  {
    gradient: "from-violet-500 to-indigo-500",
    iconBg: "bg-linear-to-br from-violet-500 to-indigo-500",
    shimmerColor: "from-violet-400/0 via-violet-100/50 to-violet-400/0",
    hoverBorder: "hover:border-violet-200",
    hoverShadow: "hover:shadow-[0_20px_60px_rgba(139,92,246,0.18)]",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="16" height="11" rx="2.5" stroke="white" strokeWidth="1.6" />
        <path d="M7 17h6M10 14v3" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M7.5 8.5L9.5 10.5L12.5 7" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Production-ready from day one",
    description:
      "Auth, roles, admin panels, analytics and session management already wired. Skip boilerplate — layer your video experience straight on top.",
  },
  {
    gradient: "from-indigo-500 to-sky-500",
    iconBg: "bg-linear-to-br from-indigo-500 to-sky-500",
    shimmerColor: "from-indigo-400/0 via-indigo-100/50 to-indigo-400/0",
    hoverBorder: "hover:border-indigo-200",
    hoverShadow: "hover:shadow-[0_20px_60px_rgba(79,70,229,0.18)]",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M3 5.5A2.5 2.5 0 015.5 3h9A2.5 2.5 0 0117 5.5v9a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 013 14.5v-9z"
          stroke="white"
          strokeWidth="1.6"
        />
        <path d="M7 10h6M10 7v6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: "Python + FastAPI at the core",
    description:
      "A clean, idiomatic Python backend you'll actually enjoy extending. FastAPI services that are easy to refactor, test, and plug AI pipelines into.",
  },
  {
    gradient: "from-sky-500 to-cyan-500",
    iconBg: "bg-linear-to-br from-sky-500 to-cyan-500",
    shimmerColor: "from-sky-400/0 via-sky-100/50 to-sky-400/0",
    hoverBorder: "hover:border-sky-200",
    hoverShadow: "hover:shadow-[0_20px_60px_rgba(14,165,233,0.18)]",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="5" width="16" height="11" rx="2" stroke="white" strokeWidth="1.6" />
        <path d="M2 8h16" stroke="white" strokeWidth="1.6" />
        <circle cx="5.5" cy="6.5" r="1" fill="white" />
        <circle cx="8.5" cy="6.5" r="1" fill="white" />
        <polygon points="8,12 13,14.5 8,17" fill="white" />
      </svg>
    ),
    title: "Video pipeline, built-in",
    description:
      "Transcoding, HLS delivery, a catalog and playback experience wired to real data — not mocked. Stream it your way from day one.",
  },
  {
    gradient: "from-emerald-500 to-teal-500",
    iconBg: "bg-linear-to-br from-emerald-500 to-teal-500",
    shimmerColor: "from-emerald-400/0 via-emerald-100/50 to-emerald-400/0",
    hoverBorder: "hover:border-emerald-200",
    hoverShadow: "hover:shadow-[0_20px_60px_rgba(16,185,129,0.18)]",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M10 2L2 6v4c0 4.42 3.38 8.56 8 9.56C15.62 18.56 18 14.42 18 10V6L10 2z"
          stroke="white"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M7 10l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Auth & roles built-in",
    description:
      "Secure session handling, user roles and permission boundaries that mirror real teams — no third-party auth glue required.",
  },
  {
    gradient: "from-amber-500 to-orange-500",
    iconBg: "bg-linear-to-br from-amber-500 to-orange-500",
    shimmerColor: "from-amber-400/0 via-amber-100/50 to-amber-400/0",
    hoverBorder: "hover:border-amber-200",
    hoverShadow: "hover:shadow-[0_20px_60px_rgba(245,158,11,0.18)]",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="11" width="3" height="6" rx="1" fill="white" />
        <rect x="7" y="7" width="3" height="10" rx="1" fill="white" />
        <rect x="12" y="4" width="3" height="13" rx="1" fill="white" />
        <path d="M2 18h16" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    title: "Analytics dashboard",
    description:
      "Watch-time charts, engagement breakdowns and content performance — live, and yours. Understand your audience without sending data anywhere else.",
  },
  {
    gradient: "from-violet-600 to-fuchsia-500",
    iconBg: "bg-linear-to-br from-violet-600 to-fuchsia-500",
    shimmerColor: "from-fuchsia-400/0 via-fuchsia-100/50 to-fuchsia-400/0",
    hoverBorder: "hover:border-fuchsia-200",
    hoverShadow: "hover:shadow-[0_20px_60px_rgba(192,38,211,0.18)]",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M10 2l1.8 5.5H17l-4.2 3 1.6 5L10 12.5 5.6 15.5l1.6-5L3 7.5h5.2L10 2z"
          stroke="white"
          strokeWidth="1.4"
          strokeLinejoin="round"
          fill="white"
          fillOpacity="0.25"
        />
      </svg>
    ),
    title: "AI-ready architecture",
    description:
      "Every service is designed to plug in AI models — FPS boosting, scene detection, smart captions, adaptive ads, multilingual. You're early.",
  },
];

export function LandingFeatures() {
  return (
    <section className="mt-16 border-t border-slate-100 pt-14">
      <div className="mb-10 space-y-2 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">
          What you get
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Everything you need. Nothing you don&apos;t.
        </h2>
        <p className="mx-auto max-w-lg text-sm text-slate-500 sm:text-base">
          A focused, opinionated VOD stack that ships real value today and stays
          out of your way as you grow.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <div
            key={feature.title}
            onMouseMove={onTiltMove}
            onMouseLeave={onTiltLeave}
            className={`group relative cursor-default overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-[0_4px_20px_rgba(15,23,42,0.05)] will-change-transform ${feature.hoverBorder} ${feature.hoverShadow} transition-[border-color,box-shadow] duration-300`}
            style={{ transitionProperty: "border-color, box-shadow, transform" }}
          >
            {/* Shine overlay — updated via DOM directly */}
            <div
              data-shine
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0"
              style={{ transition: "opacity 0.3s ease" }}
            />

            {/* Shimmer sweep on hover */}
            <div
              className={`pointer-events-none absolute inset-0 -translate-x-full rounded-2xl bg-linear-to-r ${feature.shimmerColor} opacity-60 transition-transform duration-700 group-hover:translate-x-full`}
            />

            {/* Icon */}
            <div
              className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${feature.iconBg} shadow-sm transition-transform duration-300 group-hover:scale-110`}
            >
              {feature.icon}
            </div>

            <h3 className="mb-1.5 font-semibold tracking-tight text-slate-900">
              {feature.title}
            </h3>
            <p className="leading-relaxed text-slate-500">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
