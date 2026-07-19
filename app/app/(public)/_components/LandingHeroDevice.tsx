import { forwardRef } from "react";

const WAVE_BARS = [6, 14, 9, 16, 7, 12];

// A monochrome mock laptop playing a miniature player UI — the landing
// page's one literal "this is a streaming product" visual. Real player
// affordances only (play, waveform, progress, quality) — no invented
// AI/analytics badges.
export const LandingHeroDevice = forwardRef<HTMLDivElement>(
  function LandingHeroDevice(_props, ref) {
    return (
      <div ref={ref} className="relative mx-auto w-full max-w-md lg:max-w-none">
        <div className="rounded-t-lg rounded-b-sm border border-border bg-card p-2">
          <div className="relative aspect-video overflow-hidden rounded-md bg-surface-watch">
            <div className="bg-noise absolute inset-0 opacity-[0.05]" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-foreground/40">
                <div className="ml-1 h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-foreground" />
              </div>
            </div>

            <div className="absolute bottom-10 left-1/2 flex h-4 -translate-x-1/2 items-end gap-[3px]">
              {WAVE_BARS.map((height, i) => (
                <div
                  key={i}
                  className="w-[3px] origin-bottom rounded-full bg-foreground/50"
                  style={{
                    height: `${height}px`,
                    animation: `waveform-bar ${0.9 + i * 0.1}s ease-in-out ${i * 0.08}s infinite`,
                  }}
                />
              ))}
            </div>

            <span className="absolute top-3 right-3 rounded border border-foreground/20 px-1.5 py-0.5 text-[9px] font-semibold text-foreground/70">
              1080p
            </span>

            <div className="absolute inset-x-3 bottom-3 h-[3px] rounded-full bg-foreground/15">
              <div className="h-full w-[38%] rounded-full bg-primary" />
            </div>
          </div>
        </div>
        <div className="mx-6 h-2 rounded-b-md bg-border" />
      </div>
    );
  }
);
