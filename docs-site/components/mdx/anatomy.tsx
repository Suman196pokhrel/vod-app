'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Maximize2 } from 'lucide-react';

// Embeds one of the interactive pipeline illustrations (built by `make anatomy` into
// public/anatomy/) in an iframe. The iframe keeps the illustration's own CSS and script
// sealed off from the docs site; it reports its height, and follows the docs theme.
type Plate = 'plant' | 'intake' | 'queue' | 'transcode' | 'package';

const isDark = () => document.documentElement.classList.contains('dark');

export function Anatomy({ plate, title = 'Interactive illustration' }: { plate?: Plate; title?: string }) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!isClient) return <div className="my-6 h-[640px] rounded-lg border bg-fd-card" />;
  return <AnatomyFrame plate={plate} title={title} />;
}

function AnatomyFrame({ plate, title }: { plate?: Plate; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(640);
  const [initialTheme] = useState(() => (isDark() ? 'dark' : 'light'));
  const page = plate ? `/anatomy/plates/${plate}.html` : '/anatomy/index.html';

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || e.data?.type !== 'anatomy:height') return;
      if (typeof e.data.height === 'number' && e.data.height > 0) setHeight(e.data.height);
    };
    window.addEventListener('message', onMessage);
    // next-themes toggles the `dark` class on <html>; pass every change into the frame.
    const observer = new MutationObserver(() => {
      frame.current?.contentWindow?.postMessage({ type: 'anatomy:theme', theme: isDark() ? 'dark' : 'light' }, '*');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('message', onMessage);
      observer.disconnect();
    };
  }, []);

  return (
    <figure className="not-prose my-6">
      <iframe
        ref={frame}
        src={`${page}?embed=1&theme=${initialTheme}`}
        title={title}
        loading="lazy"
        className="block w-full border-0"
        style={{ height }}
      />
      <figcaption className="mt-2 flex items-center justify-between gap-4 text-sm text-fd-muted-foreground">
        <span>{title}. Hover a machine to identify it, click to zoom, pick a scenario to run it.</span>
        <a href={plate ? `/anatomy/index.html#${plate}` : '/anatomy/index.html'} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 font-medium text-fd-foreground hover:underline">
          <Maximize2 className="size-3.5" /> Open full screen
        </a>
      </figcaption>
    </figure>
  );
}
