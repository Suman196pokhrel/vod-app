import { useId, type SVGProps } from 'react';

// The VOD mark: a play triangle cut into three slices, the way HLS cuts a
// video into segments. Uses currentColor so it follows the surrounding text.
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  // Unique per instance: a duplicate id inside a hidden copy breaks the mask.
  const maskId = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <mask id={maskId}>
        <rect width="32" height="32" fill="#fff" />
        <rect x="13.2" y="0" width="1.8" height="32" fill="#000" />
        <rect x="18.6" y="0" width="1.8" height="32" fill="#000" />
      </mask>
      <path
        d="M9 7.2c0-1.5 1.6-2.4 2.9-1.7l14.6 8.8c1.2.7 1.2 2.5 0 3.3l-14.6 8.8C10.6 27.2 9 26.3 9 24.8V7.2Z"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
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
