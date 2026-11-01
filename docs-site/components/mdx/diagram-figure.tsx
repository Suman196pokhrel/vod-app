'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';

const EASING = 'cubic-bezier(0.2, 0, 0, 1)';
const DURATION = 280;

// Shows a rendered diagram scaled to the column, and opens it full-screen on
// click. The enlarged copy zooms out of the inline one (FLIP: measure both
// boxes, animate the transform between them) and zooms back on close.
export function DiagramFigure({ svg, onMount }: { svg: string; onMount?: (el: HTMLElement) => void }) {
  const inlineRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const flip = useCallback((reverse: boolean) => {
    const from = inlineRef.current?.querySelector('svg')?.getBoundingClientRect();
    const to = zoomRef.current?.getBoundingClientRect();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!from || !to || !zoomRef.current || reduced) return Promise.resolve();
    const start = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`;
    const frames = [{ transform: start }, { transform: 'none' }];
    return zoomRef.current.animate(reverse ? frames.reverse() : frames, {
      duration: DURATION,
      easing: EASING,
      fill: 'forwards',
    }).finished;
  }, []);

  const close = useCallback(async () => {
    if (closing) return;
    setClosing(true);
    await flip(true);
    setOpen(false);
    setClosing(false);
  }, [closing, flip]);

  // Kept in a ref so the effect below runs once per open, not again when
  // `close` changes identity mid-close (that would replay the zoom-in).
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  useEffect(() => {
    if (!open) return;
    flip(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, flip]);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Enlarge diagram"
        className="mermaid-figure not-prose group"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen(true))}
      >
        <span className="mermaid-figure-hint" aria-hidden="true">
          <Maximize2 className="size-3.5" />
        </span>
        <div
          ref={(el) => {
            inlineRef.current = el;
            if (el) onMount?.(el);
          }}
          style={{ opacity: open ? 0 : 1 }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {open &&
        createPortal(
          <div
            className="mermaid-lightbox"
            data-closing={closing || undefined}
            role="dialog"
            aria-modal="true"
            aria-label="Diagram"
            onClick={close}
          >
            <button type="button" className="mermaid-lightbox-close" aria-label="Close" onClick={close}>
              <X className="size-4" />
            </button>
            <div ref={zoomRef} className="mermaid-lightbox-content" style={zoomSize(svg)} dangerouslySetInnerHTML={{ __html: svg }} />
          </div>,
          document.body,
        )}
    </>
  );
}

// Enlarged size: as big as the viewport allows (up to 1.75× natural), never
// smaller than natural size unless the width forces it; tall diagrams scroll.
function zoomSize(svg: string) {
  const match = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);
  if (!match) return undefined;
  const [w, h] = [Number(match[1]), Number(match[2])];
  const fitWidth = (window.innerWidth * 0.94) / w;
  const fitBoth = Math.min(fitWidth, (window.innerHeight * 0.88) / h, 1.75);
  const scale = Math.max(fitBoth, Math.min(1, fitWidth));
  return { width: `${w * scale}px` };
}
