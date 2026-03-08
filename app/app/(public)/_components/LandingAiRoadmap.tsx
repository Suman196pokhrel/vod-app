import React from "react";

type Status = "Exploring" | "Planned" | "On the horizon";

const STATUS_STYLES: Record<Status, { badge: string; dot: string; border: string; glow: string }> = {
  Exploring: {
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
    border: "border-amber-100 hover:border-amber-200",
    glow: "hover:shadow-[0_12px_40px_rgba(245,158,11,0.12)]",
  },
  Planned: {
    badge: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    dot: "bg-indigo-500",
    border: "border-indigo-100 hover:border-indigo-200",
    glow: "hover:shadow-[0_12px_40px_rgba(79,70,229,0.12)]",
  },
  "On the horizon": {
    badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    dot: "bg-sky-500",
    border: "border-sky-100 hover:border-sky-200",
    glow: "hover:shadow-[0_12px_40px_rgba(14,165,233,0.12)]",
  },
};

const ROADMAP_ITEMS: {
  label: string;
  status: Status;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    label: "Intelligent FPS & quality boosts",
    status: "Exploring",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M9 2v4M9 12v4M2 9h4M12 9h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
    description:
      "Use AI to selectively increase perceived FPS and visual clarity where it matters most — without blowing up bandwidth or cost.",
  },
  {
    label: "Full video transcription & captions",
    status: "Planned",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 7h8M5 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    description:
      "Auto-generate transcripts, searchable captions and content indexes — so every scene becomes discoverable and every video becomes accessible.",
  },
  {
    label: "Scene recognition & chapter navigation",
    status: "Planned",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M2 4h14M2 9h14M2 14h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="14" cy="14" r="3" stroke="currentColor" strokeWidth="1.4" />
        <path d="M13 14h2M14 13v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    description:
      "Jump straight to the exact moment you care about. Characters, topics, chapters and scene beats — detected and indexed automatically.",
  },
  {
    label: "Intuitive in-video ad placement",
    status: "Exploring",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="2" y="5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6 9h6M9 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14" cy="4" r="2" fill="currentColor" fillOpacity="0.5" />
      </svg>
    ),
    description:
      "Let AI suggest natural ad break points that respect pacing, story beats and viewer attention — instead of hard-coded random timecodes.",
  },
  {
    label: "Multi-language & localisation",
    status: "On the horizon",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 2c0 0-3 3-3 7s3 7 3 7M9 2c0 0 3 3 3 7s-3 7-3 7" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2 9h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    description:
      "Subtitles, dubbed audio tracks and localised metadata — making your entire catalog feel native in more than one language.",
  },
  {
    label: "AI-powered search & discovery",
    status: "On the horizon",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M5.5 7.5h4M7.5 5.5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    description:
      "Search for &ldquo;the moment the speaker mentions Kubernetes&rdquo; and get there instantly. Semantic video search backed by embeddings and scene-level indexing.",
  },
];

export function LandingAiRoadmap() {
  return (
    <section className="mt-20 border-t border-slate-100 pt-16">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3 md:max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">
            AI&#8209;native roadmap
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Streaming today.{" "}
            <span className="bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              AI-powered
            </span>{" "}
            tomorrow.
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
            The core stays practical: real dashboards, real FastAPI services, real flows.
            But the long-term vision leans hard into what modern AI can unlock for video.
            These aren&apos;t vague promises — they&apos;re the concrete features being built toward,
            in the open, one at a time.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {(["Exploring", "Planned", "On the horizon"] as Status[]).map((s) => (
            <div
              key={s}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium ${STATUS_STYLES[s].badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[s].dot}`} />
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ROADMAP_ITEMS.map((item, i) => {
          const styles = STATUS_STYLES[item.status];
          return (
            <div
              key={item.label}
              className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-white p-5 text-sm shadow-[0_4px_24px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1.5 ${styles.border} ${styles.glow}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Shimmer sweep on hover */}
              <div className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

              {/* Status + icon row */}
              <div className="flex items-center justify-between">
                <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                  {item.status}
                </div>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:ring-indigo-200`}>
                  {item.icon}
                </div>
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <p className="font-semibold leading-snug text-slate-900">{item.label}</p>
                <p className="leading-relaxed text-slate-500" dangerouslySetInnerHTML={{ __html: item.description }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom note */}
      <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-center text-sm text-slate-500">
        <span className="flex h-2 w-2 shrink-0">
          <span className="animate-ping-soft absolute inline-flex h-2 w-2 rounded-full bg-indigo-400 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
        </span>
        <span>
          Building in public &mdash; many of these are aspirational, and that&apos;s the
          whole point. You&apos;re early.
        </span>
      </div>
    </section>
  );
}
