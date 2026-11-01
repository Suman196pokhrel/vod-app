import type { SVGProps } from 'react';

// The VOD app's waveform mark (app/components/logos/VibeLogo.tsx), same
// geometry, drawn in currentColor so the docs keep their single accent.
const bars = [
  { x: 15, y: 35, h: 30 },
  { x: 30, y: 20, h: 60 },
  { x: 45, y: 10, h: 80 },
  { x: 60, y: 25, h: 50 },
  { x: 75, y: 40, h: 20 },
];

export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" {...props}>
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={b.y} width="10" height={b.h} rx="5" />
      ))}
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className="size-5 text-fd-primary" />
      <span className="font-semibold tracking-tight">VOD</span>
      <span className="text-fd-muted-foreground font-normal">Docs</span>
    </span>
  );
}
