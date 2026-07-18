"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let pluginRegistered = false;

/**
 * Sequenced load-in for the hero (eyebrow -> headline -> subcopy -> cta ->
 * device), plus a subtle scroll-linked parallax on the backdrop's highlight
 * layer. Both are skipped entirely for prefers-reduced-motion users.
 */
export function useHeroIntro() {
  const eyebrowRef = useRef<HTMLSpanElement | null>(null);
  const headlineRef = useRef<HTMLHeadingElement | null>(null);
  const subcopyRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const deviceRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    const elements = [
      eyebrowRef.current,
      headlineRef.current,
      subcopyRef.current,
      ctaRef.current,
      deviceRef.current,
    ];
    if (elements.every(Boolean)) {
      gsap.from(elements, {
        opacity: 0,
        y: 18,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.1,
      });
    }

    let scrollTween: gsap.core.Tween | undefined;
    if (backdropRef.current) {
      scrollTween = gsap.to(backdropRef.current, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: {
          trigger: backdropRef.current,
          scrub: 0.6,
        },
      });
    }

    return () => {
      scrollTween?.scrollTrigger?.kill();
      scrollTween?.kill();
    };
  }, []);

  return { eyebrowRef, headlineRef, subcopyRef, ctaRef, deviceRef, backdropRef };
}
