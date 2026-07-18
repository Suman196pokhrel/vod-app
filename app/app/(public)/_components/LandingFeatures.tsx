"use client";

import { useScrollReveal } from "@/lib/motion/useScrollReveal";

const FEATURES = [
  {
    number: "01",
    title: "Adaptive quality",
    description:
      "Six quality tiers, switched automatically to match your connection — no buffering, no manual toggling.",
  },
  {
    number: "02",
    title: "Every screen",
    description:
      "Phone, tablet, desktop, TV. The same fast, minimal player everywhere you watch.",
  },
  {
    number: "03",
    title: "Built for speed",
    description: "No clutter, no bloat. The feed loads fast and gets out of your way.",
  },
];

function FeatureBlock({ feature }: { feature: (typeof FEATURES)[number] }) {
  const ref = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="border-t border-landing-border pt-6">
      <span className="font-mono text-xs text-landing-muted">{feature.number}</span>
      <h3 className="mt-3 text-xl font-bold tracking-tight text-landing-fg">
        {feature.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-landing-muted">
        {feature.description}
      </p>
    </div>
  );
}

export function LandingFeatures() {
  return (
    <section className="py-20">
      <div className="grid gap-8 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <FeatureBlock key={feature.number} feature={feature} />
        ))}
      </div>
    </section>
  );
}
