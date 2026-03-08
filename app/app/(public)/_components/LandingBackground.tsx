"use client";

import React, { useEffect, useRef } from "react";

export function LandingBackground() {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!spotlightRef.current) return;
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      spotlightRef.current.style.background = `radial-gradient(600px circle at ${x}% ${y}%, rgba(99,102,241,0.075), transparent 65%)`;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-white">
      {/* Dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, #e2e8f0 1.5px, transparent 1.5px)",
          backgroundSize: "30px 30px",
        }}
      />

      {/* White radial fade at center so grid stays subtle */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 50% 40%, rgba(255,255,255,0.97) 15%, transparent 80%)",
        }}
      />

      {/* Animated gradient blobs */}
      <div
        className="animate-float-slow absolute rounded-full blur-3xl"
        style={{
          width: "720px",
          height: "720px",
          top: "-20%",
          left: "-14%",
          background: "radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 60%)",
        }}
      />
      <div
        className="animate-float-medium absolute rounded-full blur-3xl"
        style={{
          width: "580px",
          height: "580px",
          bottom: "-15%",
          right: "-14%",
          background: "radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 60%)",
          animationDelay: "2.5s",
        }}
      />
      <div
        className="animate-float-fast absolute rounded-full blur-3xl"
        style={{
          width: "460px",
          height: "460px",
          top: "38%",
          left: "32%",
          background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 60%)",
          animationDelay: "1s",
        }}
      />

      {/* Mouse spotlight — updated via ref with no re-renders */}
      <div ref={spotlightRef} className="absolute inset-0" />

      {/* Large decorative play-button ring */}
      <svg
        className="absolute opacity-[0.028]"
        style={{ top: "-8%", right: "4%", animation: "spin-slow 30s linear infinite" }}
        width="360"
        height="360"
        viewBox="0 0 360 360"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="180" cy="180" r="174" stroke="#4f46e5" strokeWidth="1.5" />
        <circle cx="180" cy="180" r="134" stroke="#4f46e5" strokeWidth="1" strokeDasharray="10 10" />
        <polygon points="150,108 150,252 263,180" fill="#4f46e5" />
      </svg>

      {/* Film-strip corner */}
      <svg
        className="absolute bottom-24 -left-6 opacity-[0.04]"
        width="190"
        height="126"
        viewBox="0 0 190 126"
        fill="none"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="188" height="124" rx="9" stroke="#6366f1" strokeWidth="2" />
        {[0, 1, 2, 3, 4].map((i) => (
          <React.Fragment key={i}>
            <rect x={9 + i * 36} y="9" width="23" height="17" rx="3" stroke="#6366f1" strokeWidth="1.5" />
            <rect x={9 + i * 36} y="100" width="23" height="17" rx="3" stroke="#6366f1" strokeWidth="1.5" />
          </React.Fragment>
        ))}
        <rect x="9" y="32" width="172" height="62" rx="5" stroke="#6366f1" strokeWidth="1" />
      </svg>

      {/* Wavy signal lines at bottom */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full opacity-[0.038]"
        height="90"
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M0,45 C180,15 360,75 540,45 C720,15 900,75 1080,45 C1260,15 1380,60 1440,45"
          stroke="#6366f1"
          strokeWidth="1.5"
        />
        <path
          d="M0,62 C180,32 360,92 540,62 C720,32 900,92 1080,62 C1260,32 1380,77 1440,62"
          stroke="#818cf8"
          strokeWidth="1"
        />
      </svg>

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-indigo-300/40 to-transparent" />
    </div>
  );
}
