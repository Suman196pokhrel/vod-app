import { forwardRef } from "react";

// Static grain, a faint grid, a slow light sweep, and a soft grayscale
// radial highlight for depth. All tonal (white-on-black), never a color
// gradient — stays within the "no gradients" rule.
export const LandingHeroBackdrop = forwardRef<HTMLDivElement>(
  function LandingHeroBackdrop(_props, ref) {
    return (
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-landing-bg">
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="animate-grid-sweep absolute inset-0" />
        <div
          ref={ref}
          className="absolute inset-0 opacity-[0.06]"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 20%, #ffffff, transparent 70%)",
          }}
        />
        <div className="bg-noise absolute inset-0 opacity-[0.035]" />
      </div>
    );
  }
);
