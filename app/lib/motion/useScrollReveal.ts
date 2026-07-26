"use client";

import { useEffect, useRef, type DependencyList } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let pluginRegistered = false;

interface UseScrollRevealOptions {
  /** Stagger the container's direct children instead of fading the container itself. */
  stagger?: boolean;
}

/**
 * Fades an element (or, with `stagger: true`, its direct children in
 * sequence) into view the first time it scrolls within 85% of the viewport.
 * Fully skipped for prefers-reduced-motion users (elements are just visible
 * immediately, no animation).
 *
 * `deps` re-registers the tween/ScrollTrigger — needed when the element's
 * content swaps after mount (e.g. a skeleton grid replaced by real cards at
 * the same DOM position, which React reconciles as one node and would
 * otherwise never re-trigger since the effect only ran once on the
 * skeleton).
 */
export function useScrollReveal<T extends HTMLElement>(
  deps: DependencyList = [],
  options?: UseScrollRevealOptions
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    const targets = options?.stagger ? Array.from(el.children) : el;

    const tween = gsap.from(targets, {
      opacity: 0,
      y: 16,
      duration: 0.4,
      stagger: options?.stagger ? 0.08 : 0,
      ease: "power1.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        toggleActions: "play none none reverse",
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
