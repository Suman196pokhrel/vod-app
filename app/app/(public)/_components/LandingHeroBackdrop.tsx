import { forwardRef } from "react";

// Static grain + a soft grayscale radial highlight for depth. This is a
// tonal vignette, not a color gradient — it stays within the "no gradients"
// rule because it never introduces hue, only light/dark falloff.
export const LandingHeroBackdrop = forwardRef<HTMLDivElement>(
  function LandingHeroBackdrop(_props, ref) {
    return (
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-landing-bg">
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
